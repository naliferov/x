[tc39.es](https://tc39.es/) [v8.dev](https://v8.dev/) [mozilla](https://developer.mozilla.org/en-US/docs/Web/API)  
  
[js 00. history](/doc/js-00-history)  
[js 01. types](/doc/js-01-types)  
[javascript engines and runtimes](/doc/javascript-engines-and-runtimes)  
[js features](/doc/js-features)  
[modules type](/doc/modules-type)  
  
Some concepts worth understanding: Closures Prototypal inheritance. Shadow DOM. Strict mode  
  
**In JS everything is stored on the heap** . Only what needs to be on the stack according to the call stack is placed on the stack.  
  
**Strings** Strings are immutable. They are stored in a pool.  
This means that once a string is added to the pool it will no longer change, and it will be collected by the garbage collector only after no references to it remain. The same goes for numbers larger than a small int.  
  
I wrote about how primitives in JS are reference types, not value types.  
And how new strings are from time to time produced by building hierarchies of references to one another - for example on slices - rather than by copying strings. And this can hurt both performance (random index access will be slower) and memory - huge strings that are in fact no longer used but were a resource for slices may remain hanging around in memory. There was a good article on this topic on Habr [https://habr.com/ru/post/449368/](https://habr.com/ru/post/449368/)  
  
**Integers** The same applies to numbers. Numbers in JS are likewise passed by reference. But in the pool they do not change. Neither do the references to them, of course.  
  
The referential nature of everything stems from the fact that JS engines (from the very first one, written by Eich at Netscape) use tagged pointers for everything. It is precisely because of this optimization that, back in the day, typeof null == 'object' came about. You can read about modern pointer optimizations on the V8 blog [https://v8.dev/blog/pointer-compression](https://v8.dev/blog/pointer-compression)  
  
Just in case, let me explain what a pool is in this context. To put it more simply - it is a Set. A set. That is, each string exists in memory in only one instance. Numbers, however, not necessarily. Because that could be inefficient in terms of speed.
