# developer growth

**Senior = system owner** (not better CRUD): design module/service boundaries · anticipate fault-tolerance, load, race conditions, degradation · ship to production-grade · influence team decisions.

**Best vector: platform-minded Node.js engineer** - Node runtime · service orchestration · async pipelines · jobs/workers · modular backend · observability. Stronger than "NestJS CRUD senior". Frame: NestJS = delivery framework · Node = runtime platform · Postgres = data engine · queue/workers = backbone.

**Grow at work = ownership expansion**, not "code more". Fastest path is bugs: race conditions · flaky · prod-only · memory/perf · integration · broken async.

**Memo, 1 page** - Problem · Current pain · Constraints · Options · Recommendation · Risks · Rollout. Moves you executor → system-shaper.

**Next 6 months:**

- **At work:** own 1-2 perimeters (background jobs/worker · backend-module architecture · observability/reliability · db correctness/migrations). Hold one perimeter, not everything.
- **Own project:** one serious backend (supervisor/service-manager · async-processing platform · notifications pipeline · workflow/job orchestration · modular backend w/ workers), brought to prod-grade: API · workers · queue/job model · retries · idempotency · logs · metrics · config · Docker · tests · migrations · README · arch doc.
- **Gaps:** Node internals · SQL/Postgres · distributed-systems basics · observability/reliability.

**Core challenge:** don't scatter across conceptual systems; bring rigor to prod-grade.
