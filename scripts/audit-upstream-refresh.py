"""Compare imported pins, declaration inventories, and ledger results.

Run after research:inventory. Pass the Flow baseline commit, then redirect stdout
into the release's evidence receipt. No imported evidence is modified.
"""

import argparse
import collections
import json
import hashlib
import pathlib
import subprocess

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("baseline")
args = parser.parse_args()


def previous(path):
    return json.loads(subprocess.check_output(["git", "show", f"{args.baseline}:{path}"], text=True))


old_pin = previous("research/UPSTREAM.json")["commit"]
new_pin = json.loads(pathlib.Path("research/UPSTREAM.json").read_text())["commit"]
base = pathlib.Path("research/artifacts/xyflow")


def files(pin):
    return {str(p.relative_to(base / pin)): p.read_bytes() for p in (base / pin).rglob("*")
            if p.is_file() and p.name not in {"FILES.tsv", "SOURCE.json"}}


a, b = files(old_pin), files(new_pin)
changed = [p for p in sorted(a.keys() & b.keys()) if a[p] != b[p]]
def tree(pin):
    return {line.split("\t", 1)[1]: line.split()[2]
            for line in (base / pin / "FILES.tsv").read_text().splitlines()}


old_tree, new_tree = tree(old_pin), tree(new_pin)
upstream_changed = [p for p in sorted(old_tree.keys() & new_tree.keys()) if old_tree[p] != new_tree[p]]

test_roots = ("tests/playwright/", "examples/react/cypress/")
old_inventory = previous("research/generated/inventory.json")
new_inventory = json.loads(pathlib.Path("research/generated/inventory.json").read_text())
if new_inventory["source"]["commit"] != new_pin:
    raise SystemExit("Run research:inventory for the current pin first")


def blob(data):
    return hashlib.sha1(f"blob {len(data)}\0".encode() + data).hexdigest()


new_integrity_errors = [p for p, data in b.items() if blob(data) != new_tree.get(p)]
if new_integrity_errors:
    raise SystemExit(f"New imported artifacts differ from upstream Git objects: {new_integrity_errors}")



def declarations(inventory):
    return {f["path"]: [(d["kind"], d["name"]) for d in f["declarations"]]
            for f in inventory["files"] if f["path"].startswith(("packages/react/", "packages/system/"))}


old_declarations, new_declarations = declarations(old_inventory), declarations(new_inventory)
old_ledger = previous("research/catalogs/upstream-test-ledger.json")
ledger = json.loads(pathlib.Path("research/catalogs/upstream-test-ledger.json").read_text())
old_cases = {c["id"]: c for c in old_ledger["cases"]}
cases = {c["id"]: c for c in ledger["cases"]}
status_changes = {}
reason_changes = {}
counts = {}
for host in ("vanilla", "vue", "foldkit", "react"):
    def result(case):
        return case["reference"] if host == "react" else case["hosts"][host]
    status_changes[host] = [{"id": key, "before": result(old_cases[key]), "after": result(cases[key])}
                            for key in sorted(old_cases.keys() & cases.keys())
                            if result(old_cases[key])["status"] != result(cases[key])["status"]]
    reasons = collections.defaultdict(list)
    for key in sorted(old_cases.keys() & cases.keys()):
        old_reason, new_reason = result(old_cases[key]).get("reason"), result(cases[key]).get("reason")
        if old_reason != new_reason:
            reasons[(old_reason, new_reason)].append(key)
    reason_changes[host] = [{"before": before, "after": after, "ids": ids}
                            for (before, after), ids in reasons.items()]
    counts[host] = dict(collections.Counter(result(c)["status"] for c in cases.values()))

print(json.dumps({
    "baseline": args.baseline, "oldRevision": old_pin, "newRevision": new_pin,
    "addedFiles": sorted(b.keys() - a.keys()), "deletedFiles": sorted(a.keys() - b.keys()),
    "changedFiles": upstream_changed,
    "inheritedSnapshotOnlyDifferences": sorted(set(changed) - set(upstream_changed)),
    "changedTestFiles": [p for p in changed if p.startswith(test_roots)],
    "newTests": sorted(cases.keys() - old_cases.keys()),
    "retiredTests": sorted(old_cases.keys() - cases.keys()),
    "declarationChanges": [p for p in sorted(old_declarations.keys() | new_declarations.keys())
                           if old_declarations.get(p) != new_declarations.get(p)],
    "newArtifactIntegrityErrors": new_integrity_errors,
    "cases": len(cases), "statusChanges": status_changes, "reasonChanges": reason_changes, "counts": counts,
}, indent=2))
