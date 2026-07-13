[event-loop-timers-and-nexttick](https://nodejs.org/en/learn/asynchronous-work/event-loop-timers-and-nexttick)

### Eventloop cycle

When Node.js starts, it initializes the event loop, processes the provided input script (or drops into the REPL). It may make async API calls, schedule timers, or call  `process.nextTick()` , then begins processing the event loop.

## Event Loop (libuv, 4 threads by default)

#### Phases

**timers** (this phase executes callbacks scheduled by  `setTimeout()`  and  `setInterval()` ) **pending callbacks** (executes I/O callbacks deferred to the next loop iteration, executes callbacks for system operations such as types of TCP errors. For example if a TCP socket receives  `ECONNREFUSED`  when attempting to connect) **idle, prepare** (only used internally) **poll** (incoming connections, data, etc.) **check** ( `setImmediate()` callbacks are invoked here) **close callbacks** (some close callbacks, e.g.  `socket.on('close', ...)` )

Each box will be referred to as a "phase" of the event loop.

Each phase has a FIFO queue of callbacks to execute. When the event loop enters a given phase, it perform operations specific to that phase, then execute callbacks in that phase's queue until the queue has been exhausted or the maximum number of callbacks has executed. After exhausted or callback limit is reached, event loop move to the next phase

Any of operations may schedule more operations and new events processed in the  **poll**  phase are queued by the kernel, poll events can be queued while polling events are being processed

### timers

A timer specifies the  **threshold**   _after which_  a provided callback  _may be executed_  rather than the  **exact**  time a person  _wants it to be executed_ . Timers callbacks will run as early as they can be scheduled after the specified amount of time has passed; however, Operating System scheduling or the running of other callbacks may delay them.

Technically, the  **poll**  phase controls when timers are executed.

For example, say you schedule a timeout to execute after a 100 ms threshold, then your script starts asynchronously reading a file which takes 95 ms.

When the event loop enters the  **poll**  phase, it has an empty queue ( `fs.readFile()`  has not completed), so it will wait for the number of ms remaining until the soonest timer's threshold is reached. While it is waiting 95 ms pass,  `fs.readFile()`  finishes reading the file and its callback which takes 10 ms to complete is added to the  **poll**  queue and executed. When the callback finishes, there are no more callbacks in the queue, so the event loop will see that the threshold of the soonest timer has been reached then wrap back to the  **timers**  phase to execute the timer's callback. In this example, you will see that the total delay between the timer being scheduled and its callback being executed will be 105ms.

To prevent the  **poll**  phase from starving the event loop,  [libuv](https://libuv.org/)  (the C library that implements the Node.js event loop and all of the asynchronous behaviors of the platform) also has a hard maximum (system dependent) before it stops polling for more events.

### pending callbacks

This phase executes callbacks for some system operations such as types of TCP errors. For example if a TCP socket receives  `ECONNREFUSED`  when attempting to connect, some \*nix systems want to wait to report the error. This will be queued to execute in the  **pending callbacks**  phase.

### poll

The  **poll**  phase has two main functions:

1.  Calculating how long it should block and poll for I/O, then
2.  Processing events in the  **poll**  queue.

When the event loop enters the  **poll**  phase  _and there are no timers scheduled_ , one of two things will happen:

-   _If the  **poll**  queue  **is not empty**_ , the event loop will iterate through its queue of callbacks executing them synchronously until either the queue has been exhausted, or the system-dependent hard limit is reached.
    
-   _If the  **poll**  queue  **is empty**_ , one of two more things will happen:
    
    -   If scripts have been scheduled by  `setImmediate()` , the event loop will end the  **poll**  phase and continue to the  **check**  phase to execute those scheduled scripts.
        
    -   If scripts  **have not**  been scheduled by  `setImmediate()` , the event loop will wait for callbacks to be added to the queue, then execute them immediately.
        

Once the  **poll**  queue is empty the event loop will check for timers  _whose time thresholds have been reached_ . If one or more timers are ready, the event loop will wrap back to the  **timers**  phase to execute those timers' callbacks.

### check

This phase allows the event loop to execute callbacks immediately after the  **poll**  phase has completed. If the  **poll**  phase becomes idle and scripts have been queued with  `setImmediate()` , the event loop may continue to the  **check**  phase rather than waiting.

`setImmediate()`  is actually a special timer that runs in a separate phase of the event loop. It uses a libuv API that schedules callbacks to execute after the  **poll**  phase has completed.

Generally, as the code is executed, the event loop will eventually hit the  **poll**  phase where it will wait for an incoming connection, request, etc. However, if a callback has been scheduled with  `setImmediate()`  and the  **poll**  phase becomes idle, it will end and continue to the  **check**  phase rather than waiting for  **poll**  events.

### close callbacks

If a socket or handle is closed abruptly (e.g.  `socket.destroy()` ), the  `'close'`  event will be emitted in this phase. Otherwise it will be emitted via  `process.nextTick()` .

#### setImmediate()  `vs`  setTimeout()

-   `setImmediate()`  is designed to execute a script once the current  **poll**  phase completes.
-   `setTimeout()`  schedules a script to be run after a minimum threshold in ms has elapsed.

The order in which the timers are executed will vary depending on the context in which they are called. If both are called from within the main module, then timing will be bound by the performance of the process (which can be impacted by other applications running on the machine). The main advantage to using  `setImmediate()`  over  `setTimeout()`  is  `setImmediate()`  will always be executed before any timers if scheduled within an I/O cycle, independently of how many timers are present.

#### process.nextTick()

You may have noticed that  `process.nextTick()`  was not displayed in the diagram, even though it's a part of the asynchronous API. This is because  `process.nextTick()`  is not technically part of the event loop. Instead, the  `nextTickQueue`  will be processed after the current operation is completed, regardless of the current phase of the event loop. Here, an  _operation_  is defined as a transition from the underlying C/C++ handler, and handling the JavaScript that needs to be executed.

Looking back at our diagram, any time you call  `process.nextTick()`  in a given phase, all callbacks passed to  `process.nextTick()`  will be resolved before the event loop continues. This can create some bad situations because  **it allows you to "starve" your I/O by making recursive  `process.nextTick()`  calls** , which prevents the event loop from reaching the  **poll**  phase.

Why would something like this be included in Node.js? Part of it is a design philosophy where an API should always be asynchronous even where it doesn't have to be.

-   `process.nextTick()`  fires immediately on the same phase
-   `setImmediate()`  fires on the following iteration or 'tick' of the event loop We recommend developers use  `setImmediate()`  in all cases because it's easier to reason about.
