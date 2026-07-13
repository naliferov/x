[node.js job interview (Q&A)](/doc/nodejs-interview)

[event loop (node)](/doc/node-js-event-loop)

threads vs cluster `node:cluster` — a poor way to scale beyond > 6–8 processes: all connections go through the parent process via IPC, the master process is at 100% while the children are underloaded

**Better** : 1 port per thread, with load balancing in a separate Auth service. On first contact the client receives a token and several `host:port` connection points, then connects to its own thread using the token. On disconnect — parallel attempts to the primary and the backup points. Not all traffic goes through a single balancer — distribution happens only when sessions are created

Handing off CPU-heavy operations to a worker is cheaper than to another instance: via `SharedArrayBuffer` and `MessagePort` , with CAS — through shared memory.

## ECONNRESET — handling

```js
process.on('uncaughtException', (error, origin) => {
  if (error?.code === 'ECONNRESET') return;
  console.error('UNCAUGHT EXCEPTION');
  console.error(error);
  console.error(origin);
  process.exit(1);
});
```

## Memory leak — pattern (eval + closure)

A leak through a closure over the old object during hot reload via `eval(main.toString())` :

```js
const main = async () => {
    globalThis.s ??= {};
    s.test ??= {};
    const test = s.test; // <- holds the old object
    s.test = JSON.parse(await nodeFS.readFile('test.json', 'utf8'));
    s.test.testProp = () => { }; // <- adds a reference to main via the closure
    // ...
    const fn = eval(main.toString()); // <- fn captures test → leak
    await fn();
};
```

Standarts implementation:

-   **Node.js 0.x – 4.x** → mainly **ECMAScript 5 (ES5)** , but some ES6 features could be enabled via `--harmony` .
-   **Node.js 6.x** → partial support for **ECMAScript 6 (ES6)** appeared, things like `let` , `const` , arrow functions, `Map` , `Set` , `Promise` .
-   **Node.js 8.x** → **async/await** (from ECMAScript 2017).
-   **Node.js 10.x** → almost full ES6+ and new features like **optional catch binding** (from ES2019).
-   **Node.js 12.x** → experimental support for **ESModules ( `import/export` )** .
-   **Node.js 14.x** → ESModules became **stable** , and support for **ECMAScript 2020** was added ( `?.` , `??` , `BigInt` ).
-   **Node.js 16.x** → new ES2021 capabilities ( `String.prototype.replaceAll` , `??=` , `||=` , `&&=` ).
-   **Node.js 18.x** → support for ES2022 ( `Array.prototype.at` , `Error.cause` ).
-   **Node.js 20.x+** → already includes ES2023 and partially ES2024.

**node debug** npx nodemon --watch ./node --ext ts,js,json --exec 'bash -lc "NODE\_PATH=./node ./node\_modules/.bin/ts-node -r ./node/localConfig.js ./node/api/index.ts"'
