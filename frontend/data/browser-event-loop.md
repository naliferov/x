article notes [https://jakearchibald.com/2015/tasks-microtasks-queues-and-schedules](https://jakearchibald.com/2015/tasks-microtasks-queues-and-schedules)

callback, promise, tasks, microtasks, queues and schedules in browser

```js
console.log('script start');

setTimeout(function () {
    console.log('setTimeout'); 
}, 0);

Promise.resolve() .then(function () {
    console.log('promise1'); }).then(function () {
    console.log('promise2');
}); 

console.log('script end');
```

exec order:

script start script end promise1 promise2 setTimeout

Each thread gets its own  **event loop** , so each web worker gets its own, so it can execute independently, whereas all windows on the same origin share an event loop as they can synchronously communicate. The event loop runs continually, executing any tasks queued. An event loop has multiple task sources which guarantees execution order within that source (specs  [such as IndexedDB](http://w3c.github.io/IndexedDB/#database-access-task-source)  define their own), but the browser gets to pick which source to take a task from on each turn of the loop. This allows the browser to give preference to performance sensitive tasks such as user-input.

**Tasks**  are scheduled so the browser can get from its internals into JavaScript/DOM land and ensures these actions happen sequentially. Between tasks, the browser  _may_  render updates. Getting from a mouse click to an event callback requires scheduling a task, as does parsing HTML, and in the above example,  `setTimeout` .

`setTimeout`  waits for a given delay then schedules a new task for its callback. This is why  `setTimeout`  is logged after  `script end` , as logging  `script end`  is part of the first task, and  `setTimeout`  is logged in a separate task.

**Microtasks**  are usually scheduled for things that should happen straight after the currently executing script, such as reacting to a batch of actions, or to make something async without taking the penalty of a whole new task. The microtask queue is processed after callbacks as long as no other JavaScript is mid-execution, and at the end of each task. Any additional microtasks queued during microtasks are added to the end of the queue and also processed. Microtasks include mutation observer callbacks, and as in the above example, promise callbacks.

Once a promise settles it queues a  _microtask_  for its reactionary callbacks. This ensures promise callbacks are async even if the promise has already settled. So calling  `.then(yey, nay)`  against a settled promise immediately queues a microtask. This is why  `promise1` and  `promise2`  are logged after  `script end` , as the currently running script must finish before microtasks are handled.  `promise1`  and  `promise2`  are logged before  `setTimeout` , as microtasks always happen before the next task.

In ECMAScript land, they call microtasks "jobs".
