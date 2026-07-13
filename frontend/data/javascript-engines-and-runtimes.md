**JS Engine** – interpretate and exec JS (V8, JavaScriptCore, SpiderMonkey). **JS Runtime** – env, which use JS Engine and expose some API (Node.js, Deno, Bun)

### Engines

**V8** (Standalone) – V8 is the engine inside Chrome, Node.js and Deno **ChakraCore** – Microsoft's JavaScript engine, originally used in the Edge browser. **SpiderMonkey** – Mozilla’s JavaScript engine, used in Firefox **quickJS** - lightweight, no JIT **hermes** - Meta, React Native

**Engine internals** – parses JS → bytecode, runs it on a heap + call stack, then JIT-compiles hot code into machine code.

### JS Runtimes

browser [node.js](/doc/node-js) bun deno

#### WebAssembly (Wasm) Runtimes

Wasmtime WasmEdge Wasmer
