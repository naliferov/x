# terse

A tiny, async-only toy language. Keywords are `@`-mentions. Pipeline: source → tokens (lexer) → AST (parser) → **JavaScript** (code generator). Lives in ocraft as the [`terse`](/script/terse) script — it transpiles to JS and runs the emitted code (no AST interpretation). See also [super-terse-code](/doc/super-terse-code).

Current features:

- `name = expr` — variable binding
- `@(params?) -> expr / { … }` — a function; always async
- `f(args)` — call a function; **auto-awaited** (every fn is async)
- `@p expr` — get the raw promise (opt out of the auto-await)
- `@r expr` — return
- `@l(expr)` — print builtin
- numbers, `+ - * /`, `( )`

Intended direction: an embeddable, **sandboxed** scripting medium — capability-by-builtin, so a script can only do what its injected builtins expose.

## Future implementation ideas (merged from turboscript)

TurboScript is a TypeScript-like language that **compiles to WebAssembly** and has **native fixed-width integer types** (`uint8`, `int8`, `uint16`, `int16`, `int32`, `float32` …) — the thing plain JS/TS lacks (everything is float64). That's the reference point for taking terse from "expressive interpreter" toward "typed/fast":

- **Typed, bounded fixed-width integers** — give terse real numeric types with range validation, instead of JS doubles. Prototype of the idea in plain TS (a factory that mints validated integer classes):

  ```typescript
  function boundedInt(name: string, min: number, max: number) {
    return class {
      private constructor(public readonly value: number) {}

      static of(n: number): InstanceType<ReturnType<typeof boundedInt>> {
        if (!Number.isInteger(n)) throw new TypeError(`${name} must be an integer, got ${n}`)
        if (n < min || n > max) throw new RangeError(`${name} out of range ${min}..${max}, got ${n}`)
        return new this(n)
      }

      add(other: { value: number }) {
        return (this.constructor as any).of(this.value + other.value)
      }
      sub(other: { value: number }) {
        return (this.constructor as any).of(this.value - other.value)
      }

      toString() {
        return `${name}(${this.value})`
      }
    }
  }

  const Uint8 = boundedInt('uint8', 0, 255)
  const Int8 = boundedInt('int8', -128, 127)
  const Uint16 = boundedInt('uint16', 0, 65535)
  const Int16 = boundedInt('int16', -32768, 32767)
  ```

- **Compile-to-WASM path** — once terse has fixed-width types, a backend that emits WebAssembly gives near-native speed for hot paths. terse stays the _expressive/safe interpreter_ end; this is the _typed/compiled_ end.

Related: turboscript · [programming languages](/doc/programming-languages)
