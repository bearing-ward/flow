"""Remap citations through equal source lines, never estimated offsets.

Usage: python3 scripts/remap-upstream-citations.py OLD NEW --source-ref REF [--write]
Upstream lines come from immutable snapshots. Flow lines come from REF and the
working tree. Existing trace prose stays intact; edited cited prose fails closed.
"""

import argparse
import difflib
import json
import pathlib
import re
import subprocess

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("old")
parser.add_argument("new")
parser.add_argument("--write", action="store_true")
parser.add_argument("--source-ref", required=True)
args = parser.parse_args()
root = pathlib.Path("research/artifacts/xyflow")
old_root, new_root = root / args.old, root / args.new
if not old_root.is_dir() or not new_root.is_dir():
    raise SystemExit("Both imported revisions must exist before remapping citations")
maps = {}


def add_map(path, old_lines, new_lines, scope):
    mapping = {}
    for block in difflib.SequenceMatcher(None, old_lines, new_lines, autojunk=False).get_matching_blocks():
        for offset in range(block.size):
            mapping[block.a + offset + 1] = block.b + offset + 1
    maps[path] = (mapping, old_lines, new_lines, scope)


for old_file in old_root.rglob("*"):
    if not old_file.is_file():
        continue
    relative = old_file.relative_to(old_root)
    new_file = new_root / relative
    if new_file.is_file() and old_file.read_bytes() == new_file.read_bytes():
        continue
    add_map(str(relative), old_file.read_text().splitlines(),
            new_file.read_text().splitlines() if new_file.is_file() else [], "upstream")

baseline_paths = set(subprocess.check_output(
    ["git", "ls-tree", "-r", "--name-only", args.source_ref], text=True
).splitlines())
changed_paths = subprocess.check_output(
    ["git", "diff", "--name-only", args.source_ref, "--", "apps", "packages", "tests"], text=True
).splitlines()
for path in changed_paths:
    if path not in baseline_paths or not path.endswith((".ts", ".tsx")):
        continue
    old_text = subprocess.check_output(["git", "show", f"{args.source_ref}:{path}"], text=True)
    current = pathlib.Path(path)
    add_map(path, old_text.splitlines(), current.read_text().splitlines() if current.is_file() else [], "flow")

pattern = re.compile(r"`((?:apps|packages|examples|tests)/[^`:\n]+):([\d,\-]+)`")
receipt = []
unresolved = []
updates = []
counts = {"verified": 0, "unchanged": 0}


def normalized(line):
    return pattern.sub(lambda match: f"`{match[1]}:<lines>`", line)


for trace in sorted(pathlib.Path("research/traces").glob("*.md")):
    if str(trace) not in baseline_paths:
        continue

    def replace(match):
        path, locations = match.groups()
        if path not in maps:
            return match.group()
        mapping, old_lines, new_lines, scope = maps[path]
        missing = [int(n) for n in re.findall(r"\d+", locations) if int(n) not in mapping]
        if missing:
            unresolved.append({"trace": str(trace), "citation": match.group(), "missing": missing})
            return match.group()

        def remap(number):
            old_line = int(number.group())
            new_line = mapping[old_line]
            assert old_lines[old_line - 1] == new_lines[new_line - 1]
            counts["verified"] += 1
            if old_line == new_line:
                counts["unchanged"] += 1
            else:
                receipt.append({"scope": scope, "trace": str(trace), "path": path,
                                "oldLine": old_line, "newLine": new_line, "text": old_lines[old_line - 1]})
            return str(new_line)

        remapped_locations = re.sub(r"\d+", remap, locations)
        return f"`{path}:{remapped_locations}`"

    original = subprocess.check_output(["git", "show", f"{args.source_ref}:{trace}"], text=True)
    current = trace.read_text()
    lines = current.splitlines(keepends=True)
    # Replace whole aligned lines from the baseline, so generated line numbers
    # cannot accidentally match another old citation and move twice on a rerun.
    for index, line in enumerate(original.splitlines(keepends=True)):
        mapped = pattern.sub(replace, line)
        if mapped == line:
            continue
        if index >= len(lines) or normalized(lines[index]) != normalized(line):
            unresolved.append({"trace": str(trace), "traceLine": index + 1, "reason": "Cited prose changed since source-ref"})
            continue
        lines[index] = mapped
    updates.append((trace, current, "".join(lines)))

print(json.dumps({"old": args.old, "new": args.new, "flowBaseline": args.source_ref,
                  "verifiedEndpoints": counts["verified"], "unchangedEndpoints": counts["unchanged"],
                  "endpoints": receipt, "unresolved": unresolved}, indent=2))
if unresolved:
    raise SystemExit("Changed source or cited prose needs explicit research; no approximate mapping is allowed")
if args.write:
    for trace, current, updated in updates:
        if current != updated:
            trace.write_text(updated)
