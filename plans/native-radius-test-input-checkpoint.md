# Native radius test input checkpoint

2026-10-02. Root approves a test-only graph-unit input correction in existing apps/shared-e2e/handle-refresh-contract.ts. No production radius, target selection, pointer lifecycle, Schema, tolerance or reference artifact changes are authorized.

Actual preserved diagnostic log f5d7d8ed1fe89a1cb1b670d5801a06d2e19ac2b4ce3964fbf15af5077f83284e and JSON de23eb61555d036eaf038cc3e85aa775ce80672b4c574b324f1fc7b29f85cf20 were read/rehashed. Root recomputed delivered graph coordinates from actual trusted client pointermove, canvas rect+clientLeft/clientTop and accepted viewport. At zoom.5 the old12client offset is24graph, exceeding radius20, and candidate is null. At zoom2 it is6graph and actual other handle is valid. Both accepted centers are350.5,130.5. This confirms the test input mismatch, not a production radius defect.

Existing shared positive target-center offset becomes12GRAPH converted once to12*zoom CLIENT. Add an actual24GRAPH outside-radius rejection before the positive gesture, with current physical source/target bounds and accepted geometry. Assert preview candidate rejection, no edge proposal/accepted change, cleanup, then fresh positive retry to other with original acceptance assertions. Keep all original geometry/endpoint/control-mode/member assertions unchanged. Run actual shared contract for Vanilla/Vue/Foldkit at both .5 and2 zooms; report real delivered graph distances when checking new inputs. Do not change configured radius20, production code, reference capture, units or comparison precision. If another physical target, viewport pan or current geometry invalidates intended inputs, preserve the diagnostic and report before changing semantics.

## Conformity and deviations

Conforming target is radius in graph units with actual native coordinate conversion. The old fixed client offset was an invalid positive test at zoom.5. Corrected tests remain unverified pending actual three-host checks; production and original member acceptance are unchanged.
