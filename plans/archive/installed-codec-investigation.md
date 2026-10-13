# Plan 069 installed codec investigation

Recorded 2026-09-29. Status: bounded evidence only; Plan 069 remains BLOCKED. The coordinator accepted this investigation and independently reran the serviceful scheduler probe, observing `Failure []`. This record does not approve a third design or authorize product implementation.

All commands below ran from `/Users/richardmcandrews/.codex/worktrees/remaining-actionable/flow` against installed Effect `4.0.0-rc.116`, Foldkit `0.163.0`, and TypeScript `5.9.3`. The investigation used read-only source inspection and inline or in-memory probes. It wrote no source, dependency, plan, or compiler output files and started no browser. This document is a separately authorized plans-only write after those probes; none was rerun while saving it.

The JSON outputs below preserve the recorded values and are indented for readability. Diagnostic exit 0 means the stated positive and negative assertions matched the probe, not that Plan 069 implementation passed.

## Source bounds and production path

Source locations refer to the installed files under the workspace root above.

| Source bounds | Observation and evidence boundary |
| --- | --- |
| `node_modules/effect/src/Schema.ts:820-843` | ConstraintCodec carries decoded/encoded types and decoding/encoding services; ConstraintDecoder defaults decoding services to never. |
| `node_modules/effect/src/Schema.ts:4673-4686`, `:4756-4760` | Union maps a const member tuple to Type, Encoded, and both service unions. |
| `node_modules/effect/src/Schema.ts:6126-6138`, `:6150-6182` | toTaggedUnion accepts the discriminator property, including type. It rejects duplicate discriminants, creates decoded-side guards via toType, and dispatches match handlers by the tag. match is not unknown-input validation. |
| `node_modules/effect/src/Schema.ts:6276-6288` | TaggedUnion's registry constructor uses _tag; this does not restrict toTaggedUnion on an existing Union to _tag. |
| `node_modules/effect/src/Schema.ts:2480-2495` | toType sets Encoded to decoded Type, both service types to never, and discards the encoding transformation path. It is not encoded restoration or detached cloning. |
| `node_modules/effect/src/Schema.ts:14904-14907` | toCodecJson retains decoded Type and both service requirements. It does not establish synchronous capability. |
| `node_modules/effect/src/Schema.ts:1540-1544`, `:1811-1815`, `:2203-2206`, `:1262-1269` | Exit/synchronous parser constructors and the synchronous error adapter used in these probes. Non-schema failure throws the recorded adapter error. |
| `node_modules/foldkit/dist/runtime/makeElement.d.ts:13-25`, `:42-43` | ElementConfig's Model accepts a Codec with unknown services; the compiler probe tests this declaration slot, not a mounted element. |
| `node_modules/foldkit/dist/runtime/runtime.js:52-66`, `:82-104` | makeRuntime's startWith receives preserved data; resource-provider setup precedes construction of ModelJsonCodec, decodeUnknownExit, and encodeUnknownSync. |
| `node_modules/foldkit/dist/runtime/runtime.js:113-119` | Failed preserved-model decoding selects runInit; successful decoding supplies restoredModel. This branch was inspected, not mounted in a browser. |
| `node_modules/foldkit/dist/runtime/runtime.js:122-148`, `:157` | Preservation uses a 200 ms debounce, synchronous encoding inside onDebounce/onFlush, and an HMR before-full-reload handler invoking Effect.runSync(flush). Scheduling is HMR gated. |
| `node_modules/foldkit/dist/runtime/runtime.js:247-253`, `:256-277` | Commands receive provideAllResources. An accepted update publishes the model and schedules preservation/rendering when model identity changes. Command service provision is distinct from the nested synchronous parser boundary. |
| `node_modules/foldkit/dist/runtime/preserveScheduler.js:2-35` | The actual installed scheduler stores pending model state, forks its timer, flushes via the supplied callback, and cancels within its scope. This helper was executed directly. |
| `node_modules/foldkit/dist/runtime/runtime.js:43-48` | Runtime model freezing is active only with import.meta.hot and freezeModel not false. |
| `node_modules/foldkit/dist/runtime/deepFreeze.js:3-21`, `:23-54` | The helper freezes plain objects/arrays and leaves Date, Map, and class instances untouched. The helper was executed directly; the mounted runtime was not. |
| `packages/core/src/domain/flow-snapshot.ts:48-56` | Existing concrete Flow snapshots use structuredClone and recursive freezing. These probes do not establish compatibility with transformed class data or approve reusing that path for generic data. |

The inspected production path starts at native `makeElement` configuration, reaches `makeRuntime/startWith`, selects restoration or initialization, then handles accepted updates and scheduled HMR preservation. The probe paths below separately execute Schema constructors and two installed Foldkit helpers. They do not traverse an actual Flow public API, mount the Foldkit Runtime, render a view, or perform a Vite reload.

## In-memory compiler proof

The first attempt had one probe-authoring diagnostic: `new Prefix({value: "prefix:"})` passed an object to a Context.Service constructor whose argument type was never. The diagnostic was:

`TS2345: Argument of type '{ value: string; }' is not assignable to parameter of type 'never'.`

The corrected probe uses `declare const prefix: Prefix` to test Union's inferred service type. It does not construct the service class. The corrected Union probe passed, and the expanded probe below additionally tested the actual Foldkit ElementConfig Model slot. Both completed exit 0 with zero diagnostics and five checked negative probes. The compiler host supplies only a virtual source file; no file is emitted or saved.

```sh
bun --eval '
import ts from "typescript";
const fileName = process.cwd() + "/.069-virtual-tuple-probe.ts";
const source = `
import { Context, Effect, Schema as S, SchemaGetter as G } from "effect";
import type { ElementConfig } from "./node_modules/foldkit/dist/runtime/makeElement.js";
const dateCodec = S.String.pipe(S.decodeTo(S.Date, {decode: G.transform(value => new Date(value)), encode: G.transform(value => value.toISOString())}));
const union = S.Union([S.Struct({type: S.Literal("dated"), data: dateCodec}), S.Struct({type: S.Literal("counted"), data: S.Number})]);
type Decoded = typeof union.Type;
type Encoded = typeof union.Encoded;
const decoded: Decoded = {type: "dated", data: new Date()};
const encoded: Encoded = {type: "dated", data: "2026-09-29"};
// @ts-expect-error Discriminator must correlate with data.
const wrongPair: Decoded = {type: "dated", data: 1};
// @ts-expect-error Decoded dated data is Date.
const wrongDecoded: Decoded = {type: "dated", data: "2026-09-29"};
// @ts-expect-error Encoded dated data is string.
const wrongEncoded: Encoded = {type: "dated", data: new Date()};
function narrow(value: Decoded) { if (value.type === "dated") { const date: Date = value.data; return date.toISOString(); } const count: number = value.data; return String(count); }
const tagged = union.pipe(S.toTaggedUnion("type"));
const result: string = tagged.match(decoded, {dated: value => value.data.toISOString(), counted: value => String(value.data)});
class Prefix extends Context.Service<Prefix, {readonly value: string}>()("flow/069/probe/Prefix") {}
const serviceful = S.String.pipe(S.decodeTo(S.String, {decode: G.transformEffect(value => Effect.map(Prefix, service => service.value + value)), encode: G.transform(value => value)}));
const serviceUnion = S.Union([S.Struct({type: S.Literal("prefixed"), data: serviceful}), S.Struct({type: S.Literal("counted"), data: S.Number})]);
const foldkitModelSlot: ElementConfig<typeof serviceUnion.Type, {readonly _tag: "Noop"}>["Model"] = serviceUnion;
declare const prefix: Prefix;
const service: typeof serviceUnion.DecodingServices = prefix;
// @ts-expect-error Union retains service requirements at synchronous boundary.
S.decodeUnknownSync(serviceUnion)({type: "prefixed", data: "x"});
const read = S.decodeUnknownEffect(serviceUnion)({type: "prefixed", data: "x"});
Effect.runSync(read.pipe(Effect.provideService(Prefix, {value: "prefix:"})));
// @ts-expect-error Union Effect still requires Prefix.
Effect.runSync(read);
`;
const options = {strict: true, noEmit: true, skipLibCheck: true, target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, types: ["bun"]};
const host = ts.createCompilerHost(options);
const original = host.getSourceFile.bind(host);
host.getSourceFile = (name, version, onError, fresh) => name === fileName ? ts.createSourceFile(name, source, version, true) : original(name, version, onError, fresh);
host.fileExists = ((old) => name => name === fileName || old(name))(host.fileExists.bind(host));
const diagnostics = ts.getPreEmitDiagnostics(ts.createProgram([fileName], options, host));
console.log(ts.formatDiagnosticsWithColorAndContext(diagnostics, {getCurrentDirectory: () => process.cwd(), getCanonicalFileName: name => name, getNewLine: () => "\n"}));
console.log(JSON.stringify({diagnostics: diagnostics.length, negativeProbes: 5, writes: 0}));
if (diagnostics.length > 0) process.exit(1);
'
```

Recorded output; exit 0:

```json
{ "diagnostics": 0, "negativeProbes": 5, "writes": 0 }
```

The five expected errors cover wrong discriminator/data pairing, string supplied as decoded Date, Date supplied as encoded string, synchronous use of a serviceful Union, and Effect.runSync without its required service. Positive assertions cover correlated narrowing, toTaggedUnion("type") handler inference, retained Union services, supplied Effectful reading, and serviceful Model assignment to Foldkit's configuration declaration. No any or unsafe assertion was added to the probe's application types.

## Encoded and decoded runtime boundaries, serviceful reads, and malformed data

```sh
bun --eval '
import { Cause, Context, Effect, Exit, Schema as S, SchemaGetter as G } from "effect";
const dateCodec = S.String.pipe(S.decodeTo(S.Date, {decode: G.transform(value => new Date(value)), encode: G.transform(value => value.toISOString())}));
const union = S.Union([S.Struct({type: S.Literal("dated"), data: dateCodec}), S.Struct({type: S.Literal("counted"), data: S.Number})]).pipe(S.toTaggedUnion("type"));
const decoded = S.decodeUnknownSync(union)({type: "dated", data: "2026-09-29T00:00:00.000Z"});
const encoded = S.encodeUnknownSync(union)(decoded);
const wrongPair = S.decodeUnknownExit(union)({type: "dated", data: 1});
const decodedValidated = S.decodeUnknownSync(S.toType(union))(decoded);
const decodedBoundaryRejectsEncoded = S.decodeUnknownExit(S.toType(union))({type: "dated", data: "2026-09-29T00:00:00.000Z"});
let duplicateDiscriminator;
try { S.Union([S.Struct({type: S.Literal("duplicate"), data: S.Number}), S.Struct({type: S.Literal("duplicate"), data: S.String})]).pipe(S.toTaggedUnion("type")); } catch (error) { duplicateDiscriminator = error.message; }
class Prefix extends Context.Service()("flow/069/probe/Prefix") {}
const serviceful = S.String.pipe(S.decodeTo(S.String, {
 decode: G.transformEffect(value => Effect.map(Prefix, service => service.value + value)),
 encode: G.transformEffect(value => Effect.map(Prefix, service => value.slice(service.value.length)))
}));
const jsonCodec = S.toCodecJson(S.Struct({type: S.Literal("prefixed"), data: serviceful}));
const input = {type: "prefixed", data: "x"};
const missingDecode = S.decodeUnknownExit(jsonCodec)(input);
let missingEncode;
try { S.encodeUnknownSync(jsonCodec)({type: "prefixed", data: "prefix:x"}); } catch (error) { missingEncode = {name: error.name, message: error.message}; }
const providedDecoded = await Effect.runPromise(S.decodeUnknownEffect(jsonCodec)(input).pipe(Effect.provideService(Prefix, {value: "prefix:"})));
const providedEncoded = await Effect.runPromise(S.encodeUnknownEffect(jsonCodec)(providedDecoded).pipe(Effect.provideService(Prefix, {value: "prefix:"})));
const invalid = await Effect.runPromiseExit(S.decodeUnknownEffect(jsonCodec)({type: "prefixed", data: 1}).pipe(Effect.provideService(Prefix, {value: "prefix:"})));
console.log(JSON.stringify({
 tuple: {decodedDate: decoded.data instanceof Date, encoded, wrongPair: wrongPair._tag, decodedValidatedDate: decodedValidated.data instanceof Date, decodedBoundaryRejectsEncoded: decodedBoundaryRejectsEncoded._tag, decodedGuard: union.guards.dated(decoded), encodedGuard: union.guards.dated(encoded), duplicateDiscriminator},
 service: {missingDecode: missingDecode._tag, missingDecodeCause: Exit.isFailure(missingDecode) ? Cause.pretty(missingDecode.cause) : null, missingEncode, providedDecoded, providedEncoded, invalid: invalid._tag, invalidCause: Exit.isFailure(invalid) ? Cause.pretty(invalid.cause) : null},
 writes: 0
}));
if (!(decoded.data instanceof Date) || !Exit.isFailure(wrongPair) || !Exit.isFailure(decodedBoundaryRejectsEncoded) || !Exit.isFailure(missingDecode) || missingEncode === undefined || providedDecoded.data !== "prefix:x" || providedEncoded.data !== "x" || !Exit.isFailure(invalid)) process.exit(1);
'
```

Recorded output; exit 0:

```json
{
  "tuple": {
    "decodedDate": true,
    "encoded": {
      "type": "dated",
      "data": "2026-09-29T00:00:00.000Z"
    },
    "wrongPair": "Failure",
    "decodedValidatedDate": true,
    "decodedBoundaryRejectsEncoded": "Failure",
    "decodedGuard": true,
    "encodedGuard": false,
    "duplicateDiscriminator": "Duplicate discriminant: duplicate"
  },
  "service": {
    "missingDecode": "Failure",
    "missingDecodeCause": "Error: Service not found: flow/069/probe/Prefix\n    at runLoop (/Users/richardmcandrews/.codex/worktrees/remaining-actionable/flow/node_modules/.bun/effect@4.0.0-rc.116/node_modules/effect/dist/internal/effect.js:487:86)\n    at evaluate (/Users/richardmcandrews/.codex/worktrees/remaining-actionable/flow/node_modules/.bun/effect@4.0.0-rc.116/node_modules/effect/dist/internal/effect.js:438:23)\n    at <anonymous> (/Users/richardmcandrews/.codex/worktrees/remaining-actionable/flow/node_modules/.bun/effect@4.0.0-rc.116/node_modules/effect/dist/internal/effect.js:2428:9)\n    at <anonymous> (/Users/richardmcandrews/.codex/worktrees/remaining-actionable/flow/node_modules/.bun/effect@4.0.0-rc.116/node_modules/effect/dist/internal/effect.js:2506:19)\n    at <anonymous> (/Users/richardmcandrews/.codex/worktrees/remaining-actionable/flow/node_modules/.bun/effect@4.0.0-rc.116/node_modules/effect/dist/Schema.js:691:26)\n    at /Users/richardmcandrews/.codex/worktrees/remaining-actionable/flow/[eval]:19:52",
    "missingEncode": {
      "name": "Error",
      "message": "Sync adapter can only throw schema errors"
    },
    "providedDecoded": {
      "type": "prefixed",
      "data": "prefix:x"
    },
    "providedEncoded": {
      "type": "prefixed",
      "data": "x"
    },
    "invalid": "Failure",
    "invalidCause": "SchemaError: Expected string\n  at [\"data\"]"
  },
  "writes": 0
}
```

This proves only the tested codec behavior. Date data is decoded from a string and encoded back to ISO. toType validates decoded data; it rejects the encoded string. The decoded-side guard likewise rejects encoded input. Malformed input fails schema validation. Missing services are not schema mismatches; the next probe records the Cause reason separately.

## Installed preservation scheduler controls

The callbacks below use the same synchronous JSON encoder construction and callback boundary inspected at runtime.js:100-104 and :128-129. They append to a local array instead of calling the browser preservation bridge, so no browser state or external persistence is touched. Effect.scoped closes the scheduler's timer scope.

```sh
bun --eval '
import { Cause, Context, Duration, Effect, Exit, Schema as S, SchemaGetter as G } from "effect";
import { makePreserveScheduler } from "./node_modules/foldkit/dist/runtime/preserveScheduler.js";
class Prefix extends Context.Service()("flow/069/probe/Prefix") {}
const serviceCodec = S.String.pipe(S.decodeTo(S.String, {
 decode: G.transformEffect(value => Effect.map(Prefix, service => service.value + value)),
 encode: G.transformEffect(value => Effect.map(Prefix, service => value.slice(service.value.length)))
}));
const suspendCodec = S.String.pipe(S.decodeTo(S.Date, {
 decode: G.transformEffect(value => Effect.sleep(1).pipe(Effect.as(new Date(value)))),
 encode: G.transformEffect(value => Effect.sleep(1).pipe(Effect.as(value.toISOString())))
}));
async function flushProbe(Model, model, supply) {
 const records = [];
 const encode = S.encodeUnknownSync(S.toCodecJson(Model));
 const effect = Effect.scoped(Effect.gen(function* () {
  const save = value => Effect.sync(() => { records.push(encode(value)); });
  const scheduler = yield* makePreserveScheduler({onDebounce: save, onFlush: save}, Duration.seconds(10));
  yield* scheduler.schedule(model);
  yield* scheduler.flush;
 }));
 const exit = await Effect.runPromiseExit(supply ? effect.pipe(Effect.provideService(Prefix, {value: "prefix:"})) : effect);
 return {exit: exit._tag, records, reasons: Exit.isFailure(exit) ? exit.cause.reasons.map(reason => reason._tag) : [], cause: Exit.isFailure(exit) ? Cause.pretty(exit.cause).split("\n")[0] : null};
}
const results = {
 synchronous: await flushProbe(S.Struct({data: S.String}), {data: "x"}, false),
 servicefulOuterProvided: await flushProbe(S.Struct({data: serviceCodec}), {data: "prefix:x"}, true),
 serviceFreeSuspending: await flushProbe(S.Struct({data: suspendCodec}), {data: new Date("2026-09-29T00:00:00Z")}, false),
 writes: 0, mountedRuntime: false
};
console.log(JSON.stringify(results));
if (results.synchronous.exit !== "Success" || results.servicefulOuterProvided.exit !== "Failure" || results.serviceFreeSuspending.exit !== "Failure") process.exit(1);
'
```

Recorded output; exit 0:

```json
{
  "synchronous": {
    "exit": "Success",
    "records": [
      {
        "data": "x"
      }
    ],
    "reasons": [],
    "cause": null
  },
  "servicefulOuterProvided": {
    "exit": "Failure",
    "records": [],
    "reasons": ["Die"],
    "cause": "Error: Sync adapter can only throw schema errors"
  },
  "serviceFreeSuspending": {
    "exit": "Failure",
    "records": [],
    "reasons": ["Die"],
    "cause": "Error: Sync adapter can only throw schema errors"
  },
  "writes": 0,
  "mountedRuntime": false
}
```

The synchronous service-free control records its model. A serviceful codec fails even when the outer scheduler Effect is provided Prefix, because its callback starts a separate synchronous parser execution. A service-free codec that suspends also fails. Both produce Die and no recorded value. This executes the installed scheduler helper, not a mounted Runtime. It does not measure Vite error reporting, rendering, debounce delivery, restoration, or initialization fallback.

The coordinator independently reran the smaller serviceful scheduler reproduction from the investigation report and observed `Failure []`. That independent result supports this bounded failure observation; it is not a browser/HMR test.

## Cause classification and deep-freeze boundary

```sh
bun --eval '
import { Context, Effect, Exit, Schema as S, SchemaGetter as G } from "effect";
import { deepFreeze } from "./node_modules/foldkit/dist/runtime/deepFreeze.js";
class Prefix extends Context.Service()("flow/069/probe/Prefix") {}
const codec = S.String.pipe(S.decodeTo(S.String, {decode: G.transformEffect(value => Effect.map(Prefix, service => service.value + value)), encode: G.transform(value => value)}));
const missing = S.decodeUnknownExit(codec)("x");
const invalid = S.decodeUnknownExit(codec)(1);
const data = {date: new Date("2026-09-29T00:00:00.000Z"), map: new Map([["one", 1]]), nested: {value: 1}};
const frozen = deepFreeze(data);
data.date.setUTCFullYear(2030);
data.map.set("two", 2);
console.log(JSON.stringify({missingReasons: Exit.isFailure(missing) ? missing.cause.reasons.map(reason => reason._tag) : [], invalidReasons: Exit.isFailure(invalid) ? invalid.cause.reasons.map(reason => reason._tag) : [], freeze: {sameRoot: data === frozen, sameDate: data.date === frozen.date, sameMap: data.map === frozen.map, rootFrozen: Object.isFrozen(frozen), nestedFrozen: Object.isFrozen(frozen.nested), dateFrozen: Object.isFrozen(frozen.date), date: frozen.date.toISOString(), mapSize: frozen.map.size}, writes: 0}));
'
```

Recorded output; exit 0:

```json
{
  "missingReasons": ["Die"],
  "invalidReasons": ["Fail"],
  "freeze": {
    "sameRoot": true,
    "sameDate": true,
    "sameMap": true,
    "rootFrozen": true,
    "nestedFrozen": true,
    "dateFrozen": false,
    "date": "2030-09-29T00:00:00.000Z",
    "mapSize": 2
  },
  "writes": 0
}
```

Missing-service decoding has a Die reason; malformed input has a Fail reason. The plain root and nested object are frozen, but Date and Map keep their original identities. Mutating the Date and inserting into the Map remains visible through the returned value. Foldkit's helper does not create a detached snapshot or make those values immutable.

## Independent coordinator check, 2026-09-30

Root read this complete artifact and reran the first virtual compiler command without changing its code. It exited0 with zero diagnostics, five checked negatives and no writes. Root separately reproduced the serviceful installed scheduler observation `Failure []` and inspected its exact encoder callback boundary. No additional mounted, native-host or preservation acceptance follows.

## Verified limits and unfinished semantics

These results establish correlated tuple inference for this small schema, positive and negative encoded/decoded boundaries, retained service requirements, synchronous suspension/service failures, and the installed helper behavior. They do not establish a generic Flow factory or propagation through native adapters.

Still unverified are branded identity and graph integrity integration; custom data preservation through add/update/replace/change arrays, selectors, reconnect, deletion, controlled acknowledgement, and geometry; contract-aware detached snapshots and class-instance semantics; encoding failure before publication/save; service provisioning through native composition; mounted Foldkit rendering/update/restoration and HMR error delivery; packed custom-data contracts; and pinned typed-data runtime comparison. Existing concrete synchronous public getters cannot silently become Effectful. Service-free typing alone does not prove that a codec cannot suspend. No semantic member cells are closed by this investigation.

The bounded next evidence step requires review and a browser slot: an isolated development-only Foldkit fixture with a synchronous control, a serviceful codec with a resources Layer, and a suspending service-free codec. Each would mount through public makeElement, send one public update, observe actual debounce/flush errors, perform one real reload, and count initialization versus restoration while checking rendered output. No fixture, mount, browser, generator, or dependency work is authorized by this record.

## Conformity and deviations

The isolated compiler, parser, and helper behavior conforms to the installed Schema service typing, decoded/encoded distinction, synchronous failure boundary, and Foldkit's documented plain-container freeze scope. The tested correlated type variants need no cast or discriminator change. Flow's proposed typed-data contract, all transition/native-host semantics, detached getters, mounted Foldkit preservation, and upstream typed-data behavior remain unverified. The test boundary is the virtual TypeScript program, exact installed Schema constructors, preserveScheduler, and deepFreeze; production Runtime/HMR behavior was source-inspected only. This is bounded research evidence, not a third design approval, product implementation, parity claim, or Plan 069 closure.
