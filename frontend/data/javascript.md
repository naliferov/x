[javascript engines and runtimes](/doc/javascript-engines-and-runtimes)

Reactivity - deferred recomputation (MeteorJS approach) Problem: atom A depends on B and C; when B and C change, A is recomputed twice. Solution: defer the recomputation of dependent atoms until the end of the current event handler. When linking atoms, record the maximum depth + 1. When iterating over the deferred ones, update atoms with the smaller depth first. That way, by the time of recomputation, all direct dependencies are already up to date.

**CSS flex - wrapping to the next line**

```css
flex: 1 0 100%;
```

## Interpretation vs compilation

Parsing → AST → (Bytecode | JIT | Threaded code). Threaded code is a way of implementing an intermediate VM alongside bytecode. [javascript snippets](/doc/javascript-snippets) [javascript changelog](/doc/javascript-changelog)

**Code structure:** Statements Semicolons. A semicolon may be omitted in most cases when a line break exists. But this wouldn’t work:

```
alert("Hello")
[1,2].forEach(alert)
```

**“use strict”** directive effects:

-   Disallows implicit globals
-   Makes this undefined in functions
-   Prevents duplicate parameters
-   Makes certain silent errors throw exceptions
-   Disallows with
-   Restricts eval

### types:

Number, BigInt, String, Boolean, Null, symbol, object **typeof operator**

**type conversions** String conversion is mostly obvious. A `false` becomes `"false"` , `null` becomes `"null"` , etc.

Numeric conversion in mathematical functions and expressions happens automatically If the string is not a valid number, the result of such a conversion is `NaN`

Boolean conversion is the simplest one. Values that are intuitively “empty”, like `0` , an empty string, `null` , `undefined` , and `NaN` , become `false` . Other values become true.

var, let, const control flow loop function

##### async programming

callback [promise](/doc/promise) async await

setTimeout setInterval

##### meta programming

proxy, reflect

##### Internals

[event loop (browser)](/doc/browser-event-loop)
