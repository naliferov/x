**clean code** [rules (wojteklu)](https://gist.github.com/wojteklu/73c6914cc446146b8b533c0988cf8d29)  
low coupling · high cohesion · modularity · IoC  
  
**arch types**: layered/onion · hexagonal (ports & adapters) · monolith/microservice · n-tier  
[simonbrown](https://simonbrown.je/) · [graca chronicles](https://herbertograca.com/2017/07/03/the-software-architecture-chronicles/) · [gtoolkit](https://gtoolkit.com/)  
CQRS · clean · layered · hexagonal  
  
hexagonal = ports & adapters (cockburn; freeman & pryce, «growing OO software with tests»)  
DCI (coplien & reenskaug) · BCE (jacobson, «OO software engineering: use-case driven»)  
usage interface = implementation detail  
GoF · PoEAA · SOLID · GRASP · KISS · DRY · YAGNI · law of demeter  
  
**service** = loose coupling: must not depend on the app; exposes a concrete, stable interface; is versioned.  
**domain = model** (not the DB-entity/schema). owns business processes; knows nothing of storage, source, or presentation.  
always a **mediator** between model & view; the model knows neither — it only emits events (observers/listeners/message-passing).  
templates: no imperative logic, no conditionals — only data-insertion points. VM/controller/view never do I/O directly (→ mediator services); no network from the view. carve layers, but no architecture-astronautics.  
bind late & dynamically; controller sanitizes, model validates.  

## system design — patterns

slow down · circuit breaker · bulkhead · exponential backoff · adaptive throttling  
  
**systems theory**: bertalanffy «general system theory» · wiener «cybernetics» · forrester «principles of systems» · beer «brain of the firm» · simon «the sciences of the artificial»
