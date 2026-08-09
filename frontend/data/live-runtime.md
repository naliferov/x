# live-runtime

The idea: a JS-shaped language where **each function carries its own test and its own contract**, and changing one function immediately re-verifies everything downstream — at runtime, without a separate test run. The typed sibling of [terse](/doc/terse), whose stated direction is already "expressive interpreter → typed/fast".

None of the pieces are new; they're just usually kept apart. Below: what each piece is called, where it already works, what assembles on plain TS today, and what genuinely has no off-the-shelf answer.

## The techniques and their names

| The wish | Name of the technique | Where it works live |
| --- | --- | --- |
| every function has a test built in | **in-source testing**, **doctest** | Vitest (`import.meta.vitest`), Rust (`#[cfg(test)]` + doc-tests), D (`unittest {}`), Zig (`test "…" {}`), Python `doctest`, Elixir doctests |
| the function states what must hold | **Design by Contract** (pre/post/invariant), **contracts** | Eiffel (`require`/`ensure`), Racket (`contract-out`, blame), JML |
| checking happens while it runs | **runtime assertion checking**, **runtime verification** | JML RAC, `node:assert` in dev builds, `tiny-invariant` |
| types, but checked on execution | **gradual typing**, **types-as-contracts** | Typed Racket (Findler & Felleisen, 2002); in JS — Deepkit (TS types survive to runtime), typia (validators generated from types), Zod / ArkType |
| change a chain → it re-checks itself | **continuous testing** (Saff & Ernst, MIT, 2003) | Wallaby.js, Quokka.js, NCrunch, Infinitest, `vitest --watch` |
| re-check only what the change touched | **test impact analysis**, **affected tests** | Vitest/Jest via the module graph, Nx `affected`, Bazel, predictive test selection at Google/Meta |
| the test is not one example but a claim | **property-based / generative testing** | fast-check (JS), QuickCheck, Hypothesis |

The closest thing to all of it in one place is **`clojure.spec`**: `s/fdef` attaches a spec to a function, `stest/instrument` turns that spec into **runtime argument checking**, and `stest/check` **generates tests** from the same spec. One declaration, three uses.

The research umbrella where these meet — live values on screen plus checks as you type — is **live programming** / **example-centric programming**: Smalltalk and Pharo, Glamorous Toolkit, Jonathan Edwards' Subtext, Bret Victor's *Inventing on Principle*.

## What already assembles on plain TS

```ts
// math.ts — the test sits under the function; stripped from the production build
export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

if (import.meta.vitest) {
  const { test, expect } = import.meta.vitest
  test('clamp', () => {
    expect(clamp(5, 0, 3)).toBe(3)
    expect(clamp(-1, 0, 3)).toBe(0)
  })
}
```

Four bricks, all shipping today:

1. **Vitest in-source tests** — the test lives in the same file as the function; `define: { 'import.meta.vitest': 'undefined' }` removes it from the bundle.
2. **Vitest watch** — the module graph decides what to re-run, so editing `clamp` re-runs the tests of everything that imports it, transitively.
3. **Zod / ArkType / typia** — a schema on input and output, wrapped around the function, becomes a pre/postcondition checked on every call.
4. **fast-check** — inputs generated from that same schema, so the test stops being one hand-picked example.

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

The typed direction recorded in [terse](/doc/terse) (bounded fixed-width integers, a compile-to-WASM path) is the *value* axis; this is the *verification* axis. They share the same front end.

Search terms to go deeper: **contract programming**, **executable specification**, **continuous testing**, **incremental computation**, **live programming**.

Related: [terse](/doc/terse) · [programming languages](/doc/programming-languages) · [javascript types](/doc/javascript-types) · [glossary](/doc/glossary)
