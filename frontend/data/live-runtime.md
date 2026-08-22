# live-runtime

The idea: a JS-shaped language where **each function carries its own test and its own contract**, and changing one function immediately re-verifies everything downstream — at runtime, without a separate test run. The typed sibling of [terse](/doc/terse), whose stated direction is already "expressive interpreter → typed/fast".

None of the pieces are new; they're just usually kept apart. Below: what each piece is called, where it already works, what assembles on plain TS today, and what genuinely has no off-the-shelf answer.

The closest thing to all of it in one place is **`clojure.spec`**: `s/fdef` attaches a spec to a function, `stest/instrument` turns that spec into **runtime argument checking**, and `stest/check` **generates tests** from the same spec. One declaration, three uses.

## What already assembles on plain TS

Plus **Wallaby.js / Quokka.js** if the results should appear inline while typing rather than in a terminal.

So "pseudo-JS with types that exist at runtime" needs no new language: **Deepkit** keeps TS types alive through a transformer, **typia** compiles them into validators.

## What has no off-the-shelf answer

- **Function-level granularity.** Everything above re-checks by **module**, not by function. Edit one function in a 300-line file and every dependent file's tests re-run. Function-precise invalidation needs incremental computation over an IR — **Salsa** (the engine under rust-analyzer), Adapton, Skip. Nothing equivalent exists for JS.
- **Cost in production.** Contracts are not free, and higher-order contracts are the expensive case (the wrapper lives as long as the value — the blame problem). Every practical system therefore enables them in dev and strips them in prod, which means the guarantee holds exactly where it was least needed.
- **Tests generated from the contract.** Eiffel AutoTest and .NET IntelliTest/Pex do this with symbolic execution. In JS the ceiling is generation from a schema, which is much weaker.

## Why terse is the right starting point

terse already owns the piece that is missing everywhere else: it **compiles** source → tokens → AST → JS ([terse](/doc/terse) has the sigil table, [/script/terse](/script/terse) runs it). Owning the AST is exactly what function-level invalidation requires — the thing no JS tool can do because it only ever sees modules.

Three additions, in the order that keeps each step useful on its own:

1. **A test/spec form as syntax, not a library call** — a block attached to the function the way D's `unittest` and Zig's `test` are, so it cannot drift away from what it tests and is dropped by the code generator in a release build.
2. **Contracts emitted around calls** — the generator wraps a checked call in dev and emits the bare call in release. This is the same lever as `stest/instrument`, and it is a code-generator switch rather than a runtime feature.
3. **A call graph at function granularity** — the parser already builds it; then "changed a function → re-run the tests of its transitive callers" becomes a graph walk instead of a filesystem heuristic.

Ось значений - в [terse](/doc/terse); здесь - ось проверки, с тем же фронтендом.

Related: [terse](/doc/terse) · [glossary](/doc/glossary)
