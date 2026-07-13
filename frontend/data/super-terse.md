# super-terse

A lossy text-compression style: squeeze prose down to a **telegraphic skeleton** — keep the load-bearing meaning, throw away everything else. (Linguistically it's the _telegraphic register_ — the way telegrams and notes drop function words.) For the code equivalent, see [super-terse-code](/doc/super-terse-code).

## The operations

1. **No preamble, no wrap-up, no echo** — answer straight: no invented title, intro line, or summary you weren't asked for; never restate the question.
2. **Strip decorative structure, keep tabular** — drop titles/headings/wrappers, _but_ render any list/enumeration as a **table or bullets, never running prose** (denser, scannable). Strip ceremony, keep structure that carries data.
3. **Remove markdown formatting** — bold/italic/links become plain text (you lose clickable links).
4. **Cut parenthetical elaboration** — delete "(for example …)" asides.
5. **Drop qualifiers and dead hedges** — "DB invariants" → "invariants"; cut "probably / it seems / note that / arguably" _unless the caveat actually carries information_.
6. **Compress connective filler** — "One source of truth for this repo:" → "read this:"; "Read it first; follow the rules." → "follow the rules."
7. **Telegraphic register** — imperative voice; no articles, connectives, or inserted clauses: "a pointer to it" → "pointer to README".
8. **Notation over words** — `→ = ≥ ≠ · ≈ +` replace "leads to / is / at least / not / and / about" — the prose bridge to [super-terse-code](/doc/super-terse-code).

Punctuation: short dash `-`, not the long `—`.

## Keeps vs loses

- **keeps:** the semantic skeleton — the claims, the imperative, the pointers.
- **loses:** clickable links, specific enumerations, grammatical polish. Reads like notes.

## When

- **use for:** instruction files, scratch notes, anything read for its content where tokens/scan-speed matter more than polish.
- **avoid for:** anything published or navigable (you lose links + specificity), or where tone/precision carries weight.

## Worked example

Before (`CLAUDE.md`):

> One source of truth for this repo: **[README.md](README.md)** — what ocraft _is_ (project overview, setup, the node model, tasks/scheduler & services) plus, in its _Working in this repo_ section, the working rules: conventions, coding rules, DB invariants, and agent behaviour. Read it first; follow the rules when editing. (AGENTS.md is just a pointer to it.)

After (super-terse):

> read this: README.md what ocraft _is_ plus, working rules: conventions, coding rules, invariants, agent behaviour. follow the rules. AGENTS.md is pointer to README.md
