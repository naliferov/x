**thread pool libuv** - 4 потока по умолчанию, и ими пользуются только **fs, crypto, zlib и DNS-резолв**. Всё остальное - в основном потоке.

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

## debug

**node debug** npx nodemon --watch ./node --ext ts,js,json --exec 'bash -lc "NODE\_PATH=./node ./node\_modules/.bin/ts-node -r ./node/localConfig.js ./node/api/index.ts"'
