---
name: dev-plan-for-day
description: Analyze the x repo and produce a sequenced ONE-DAY (~24h) plan for autonomous AI development — what to build next, in what order, and why — broken into work sessions of small PR-able tasks the dev loop can execute hands-off. The plan is proposed and discussed with the user FIRST; once approved, the day runs autonomously without further questions. Use when the user asks to "plan a day of x dev", "what should I build today", "make a daily dev plan", or to feed an autonomous coding day.
---

# x one-day autonomous dev plan

Produce a bounded, sequenced **one-day (~24 hours)** plan for **autonomous (AI-driven)
development** of x: the model decides where the project should move next *today*, then
turns that into small, independently shippable, verifiable tasks grouped into a few **work
sessions**. The plan is the *input* to the execution half of the loop (a per-task agent run
on a branch → checks → PR).

The contract is two phases:

1. **Plan, then discuss (NOT autonomous).** This skill *only* produces the plan and presents
   it to the user for discussion and sign-off. Stop and wait. Do not start building.
2. **Execute autonomously (hands-off).** Once the user approves the plan, the day runs
   **fully autonomously** — work the tasks in order, branch → verify → PR per task, **without
   asking the user anything further**. Surface blockers in the end-of-day summary, not as
   mid-day interruptions.

## Read first (establish state, don't guess)

1. **The Roadmap** — the *Roadmap* section at the bottom of `README.md` (the parking lot:
   titles + why-interesting, grouped into Project ideas / Infrastructure / Generative art).
   Infer build order from it — foundations before the leaves that depend on them (e.g.
   daily-briefing needs the x self-MCP; mobile needs the WS exchange). Also skim
   `plans/` for any longer-form design notes.
2. **`git log --oneline -20`** — what actually shipped recently (don't re-plan done work).
3. **Current code state** — node types (`frontend/src/components/NodeItem/NODE_TYPES`),
   backend routes (`backend/server.js`), entries (`backend/entries/`), procs
   (`backend/procs/`), skills (`.claude/skills/`). Note what already exists so the plan
   builds on it.
4. **Any prior day plan** in `dev-plans/` — carry forward what was deferred or left unfinished.

## Method

1. **Direction (judgment first).** In 2–4 sentences, state what x should move on *today*
   and *why now* — grounded in the build-order and what just shipped. **Select and sequence
   within the README Roadmap**; that's the human-authored intent. If you
   think something genuinely new belongs, add it under a separate **"Proposed new direction
   (needs sign-off)"** heading — flagged, not silently planned as work.
2. **Shape the day into 3–5 work sessions.** Each session is a coherent ~3–5h increment with
   a theme that advances the direction, ordered so foundations land before the leaves that
   depend on them. A realistic autonomous day is roughly **6–12 PR-sized tasks total** — be
   honest about throughput, don't pack a month into a day.
3. **Pick each session's tasks.** Choose **2–4 tasks per session** from the build-ready tier,
   ordered by: *unblocks-the-most* > *high value* > *low risk*. Prefer foundations over
   leaves. Each task must be **PR-sized** (one feature/fix, finished in well under an hour of
   focused work) and **independently shippable + verifiable**. A `design-open` item enters the
   plan only as a *decision spike* (output = a decision + a one-paragraph ADR), never as
   open-ended building.
4. **Spec each task** with:
   - **Title** + **why now** (value + what it unlocks)
   - **Touchpoints** — the real files/dirs it changes
   - **Acceptance check** — a concrete, observable gate (a command that passes, an endpoint
     that returns X, a screenshot of the running app showing Y). No vague "works".
   - **Size** — S / M / L
   - **Risk / guardrail** — anything that could break; always: branch, run checks, open a PR.
5. **Sequence + defer.** Order sessions and tasks by dependency (foundations first). List what
   you explicitly **deferred today and why** (so nothing silently drops), and note any
   cross-session dependencies.

## Output

Write the plan to **`dev-plans/<YYYY-MM-DD>-day.md`** (create the `dev-plans/` dir) so it's
durable and the execution loop can consume it — then **present a short summary to the user and
stop for discussion**. Do not begin executing until the user approves. Shape:

```md
# x dev plan — day of <date>

## Direction
<2–4 sentences: what to move on today, and why now>

## Session 1 — <theme>  (~<hours>)
1. **<title>** — <why now>
   - Touchpoints: <files>
   - Acceptance: <observable check>
   - Size: <S/M/L> · Risk: <note>
2. …

## Session 2 — <theme>  (~<hours>)
…

## Session 3 — <theme>  (~<hours>)
…

## Deferred today
- <item> — <reason>
```

## Autonomy framing (how this plan gets executed)

After the user approves, this plan feeds the autonomous cycle, repeated per task across the
day: **execute one task → verify → PR → next task**. Two honest preconditions, or the loop
produces plausible-looking breakage:

1. **A real verification gate is the keystone, and it doesn't fully exist yet.** Today x
   has only `node --check` and `npm run build` (syntax/compile) plus manual screenshots — none
   of which proves *behavior*. So until there's an actual test/check harness, **every PR still
   needs a human to confirm it works**; the acceptance check is a smoke test, not a correctness
   proof. Building that harness is itself a high-value early task (see the README Roadmap).
2. **The executor is a dedicated `dev-task` entry, NOT `POST /api/ai-chat`.** The ai-chat
   endpoint is bypassPermissions + no-auth + localhost-only — it must never run git/branch/PR
   work. A separate entry owns the explicit git workflow (branch → commit → push → `gh pr
   create`), which also requires `gh` authenticated and `origin` set (verify before relying on
   it). One concern per surface: chat is for interactive local use; `dev-task` is the loop's arm.

Hard rules for the autonomous day:
- **One task per run**, on a **branch**, never `main`.
- **Gate on the acceptance check** — only open the PR if it passes (`node --check`, the
  frontend build, an entry run, a screenshot — whatever the task specified).
- **PR for human review**; **never auto-merge**.
- **Don't interrupt the user mid-day.** If a task is blocked or a decision is genuinely
  required, skip it, note it, move to the next task, and report it in the end-of-day summary.
- Keep tasks bounded — open-ended "build the vision" goes off the rails; "implement task N"
  doesn't.

Keep the plan tight and honest — one day of real, checkable steps grouped into a few sessions,
sized to what an autonomous loop can actually finish, not a wishlist.
