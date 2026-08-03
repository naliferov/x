[https://en.m.wikipedia.org/wiki/Reactive\_programming#Glitches](https://en.m.wikipedia.org/wiki/Reactive_programming#Glitches)  
  
push & pull-based reactivity  
  
Ryan (the author of Solid) has a stream where he walks through the evolution of reactivity approaches [https://www.youtube.com/live/R5AcOtxIdMk?feature=shared](https://www.youtube.com/live/R5AcOtxIdMk?feature=shared)  
  
Open a regular playground and write something like {{ (() => { console.log(“test”)})() }} in the template, then trigger a change to the reactive variable a few times  
  
Reactivity - deferred recomputation (MeteorJS approach) Problem: atom A depends on B and C; when B and C change, A is recomputed twice. Solution: defer the recomputation of dependent atoms until the end of the current event handler. When linking atoms, record the maximum depth + 1. When iterating over the deferred ones, update atoms with the smaller depth first. That way, by the time of recomputation, all direct dependencies are already up to date.
