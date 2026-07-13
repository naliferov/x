**Senior = system owner** (not better CRUD): design module/service boundaries · anticipate fault-tolerance, load, race conditions, degradation · ship to production-grade · influence team decisions. Split app/domain/infra layers; choose monolith vs job-runner/queue-consumer/cron/webhook; keep the codebase from sprawling.

**Node internals (know cold):** event-loop phases · micro vs macrotasks · promise scheduling · streams/pipeline · backpressure · child_process/worker_threads · cluster (legacy/limited) · memory profiling · heap vs stack · GC · open handles · graceful shutdown. Explain why a service eats memory / hangs / won't terminate / slows under peaks / breaks on large JSON / degrades on sync ops.

**Internals lab (build):** services with a memory leak · blocked event loop · stream processing · worker_threads CPU task · graceful shutdown · retry/backoff/idempotency. Patterns: modular monolith · hexagonal/clean (no fanaticism) · DDD-lite · message-driven · outbox · saga (orchestration vs choreography) · queues · webhook reliability · transactional boundaries · optimistic vs pessimistic concurrency · soft-delete/audit/event-history · multi-tenant · background jobs.

**DB - the real bottleneck, not Node:** indexing · query planning · N+1 · txn isolation · deadlocks · migration strategy + zero-downtime-ish · pagination · read/write patterns · connection pooling · prepared statements · locks · UPSERT · partial indexes · jsonb (when apt, not religion). Know SQL under the hood; know when Prisma helps vs hurts; drop to a lower level; review data models as an engineer, not an ORM user.

**Observability/reliability:** structured logging · correlation/request ids · health checks · readiness/liveness · metrics · tracing · alertable failure modes · config mgmt · secret handling · rate limiting · circuit breakers · timeout budgets · retry discipline · chaos thinking.

**Bring every pet project to prod-grade:** Dockerfile · env strategy · startup validation · graceful shutdown · logs · metrics · migrations · error classification · retry · team-grade README · design notes · 2-3 options with trade-offs · argue against premature microservice · see hidden complexity · cut scope · don't overengineer · stabilize.

**Grow at work = ownership expansion** (not "code more"):

- **Bugs** (fastest seniority): race conditions · flaky · prod-only · memory/perf · integration · broken async.
- **Architecture:** refactor module boundaries · redesign async + auth/session flow · split responsibilities · job processing · unify error handling · logging/monitoring.
- **Infra:** CI · deploy safety · migrations process · preview envs · observability · cron/job reliability · queueing · failure recovery.
- **Memos** (1 page): Problem · Current pain · Constraints · Options · Recommendation · Risks · Rollout. Moves you executor → system-shaper.
- **Review beyond naming/style:** boundaries · maintenance cost · failure modes · hidden coupling · txn correctness · observability gaps · API contracts.

**Best vector: platform-minded Node.js engineer** - strong in Node runtime · service orchestration · async pipelines · jobs/workers · modular backend · observability · infra-aware dev. Stronger than "NestJS CRUD senior." Frame: NestJS = delivery framework · Node = runtime platform · Postgres = data engine · queue/workers = backbone · supervisor/orchestrator = leverage.

**Next 6 months:**

- **At work:** own 1-2 perimeters (background jobs/worker · backend-module architecture · observability/reliability · db correctness/migrations). Hold one perimeter, not everything.
- **Own project:** one serious backend (supervisor/service-manager · async-processing platform · notifications pipeline · workflow/job orchestration · modular backend w/ workers), brought to prod-grade: API · workers · queue/job model · retries · idempotency · logs · metrics · config · Docker · tests · migrations · README · arch doc.
- **Gaps:** Node internals · SQL/Postgres · distributed-systems basics · observability/reliability.

**Signs of growth:** spot root cause faster · catch integration risks early · think rollback pre-release · ask about consistency/load/retries/observability · trusted with a subsystem not an endpoint · explain trade-offs without fluff · decisions leave the codebase more robust.

**Core challenge:** don't scatter across conceptual systems; bring rigor to prod-grade. Thinking system-builder → reliable senior backend owner.
