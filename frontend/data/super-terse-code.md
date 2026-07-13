# super-terse-code

The code sibling of [super-terse](/doc/super-terse). Where super-terse squeezes _prose_ to a telegraphic skeleton, super-terse-code squeezes _code_: replace each language keyword with a 1-char **sigil**, drop the boilerplate punctuation, keep the semantic structure. You trade legibility-at-a-glance for density — so it needs a **legend** (or a compiler) to read back.

We already have a working instance: **terse** (run it in [/script/terse](/script/terse)). It doesn't interpret — it _compiles_ to plain JS, so the sigils map 1:1 onto real language constructs.

## terse sigils

| terse         | JS              | meaning  |
| ------------- | --------------- | -------- |
| `name = e`    | `let name = e`  | bind     |
| `@ -> …`      | `async () => …` | fn                 |
| `f(x)`        | `(await f(x))`  | call (auto-awaited) |
| `@p f(x)`     | `f(x)`          | promise (no await) |
| `@r e`        | `return e`      | return             |
| `@l(e)`       | `log(e)`        | print              |

Keywords become `@`-mentions; `=`, `+ - * /`, `( )`, `{ }` stay. Every `@` fn is `async` and **calls auto-`await`** (`@p` keeps the raw promise), so nothing is faked. Params go in `@(a, b) -> …`.

## Worked example

terse:

```
onePlusOne = @ -> {
    sum = 1 + 1
    @r sum
}
result = onePlusOne()
@l(result)
```

compiles to JS:

```js
let onePlusOne = async () => {
  let sum = (1 + 1)
  return sum
}
let result = (await onePlusOne())
log(result)
```

## The principle

- **keyword → sigil** — `async`/`await`/`return`/`function` collapse to one glyph each.
- **drop ceremony** — no `function`, no `const`/`let` (binding is just `=`), no statement terminators.
- **keep structure** — expressions, blocks, call/args, and the async shape survive unchanged.

## Tradeoff

Dense and fast to _write_, slow to _read cold_ — the glyphs carry no mnemonic, so a newcomer needs the legend. Same bet as super-terse prose: worth it when the author re-reads often and the compiler (or a fixed legend) guarantees it round-trips. Not worth it for code others must read without the key.
