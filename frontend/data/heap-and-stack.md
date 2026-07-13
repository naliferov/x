**heap** - managed by the GC (GC'd runtimes) or by the programmer (manual runtimes).

**Why the stack is faster:**

- contiguous, fixed size, not chunks of pages
- allocated at program start, lives till process end - no tracking/cleaning/load/unload (the OS process manager handles it)
- sequential push/pop, not random access
- top-of-stack address always in a CPU register
- almost always cached (accessed most)

**Stack size** - 1-10MB on modern OS; tunable at OS/process level but don't (a 1GB stack never fits cache). Ignore it unless you write systems code.
