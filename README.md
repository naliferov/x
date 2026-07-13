# ocraft

A personal, local-first **offline knowledge + scripts app**: a flat, link-based set of **docs** (the knowledge base), runnable **scripts** (Vue / Solid / vanilla experiments), and **bins** (binary assets) — all discovered from disk and served by a tiny, framework-free Node.js backend. Navigation is by **hyperlinks, not folders**, and docs are editable in place. A Vue 3 + Vite + Tailwind/daisyUI frontend over a plain Node.js runtime in **TypeScript** (ESM, run via native type stripping — no backend build step).

## The app (`frontend/`)

A Vite single-page app. The sidebar lists three kinds of thing under one filter; the right pane runs or renders the selection. In-app links (`/doc/<name>`, `/script/<name>`, `/bin/<name>`) navigate without a reload and work as deep links. No login. Content — docs and bins — lives together in one flat `frontend/data/` dir (kind is by extension, not folder); runnable scripts stay in `frontend/scripts/`.

- **docs** (`frontend/data/*.{html,md}`) — the knowledge base: hand-authored HTML fragments or Markdown, discovered by `import.meta.glob` (md compiles to html on load via `marked`, rendered through the same pane; use html only for markup md can't hold — inline color, tables, embeds). **Flat namespace, no folders** — you organize by **hyperlinks** and hand-curated *index / hub* docs (Maps of Content), so one doc can sit under many indexes. Read-only when deployed, but **editable in place in dev**: an *edit* button opens the raw source, and *save* writes back to the file via a Vite middleware.
- **scripts** (`frontend/scripts/*.{vue,js,ts,jsx,tsx}`) — runnable experiments, told apart by extension: `.vue` = a Vue component; `.js`/`.ts` = vanilla (`export default (host) => cleanup?`); `.jsx`/`.tsx` = a Solid component. Vite compiles them; cross-script reuse is plain ES `import`. Some talk to the live backend (a harness → `/api/claude`, the ws testers → `/api/ws`).
- **bins** (`frontend/data/`, alongside docs) — binary / large / downloadable assets, discovered via `import.meta.glob(..., { query: '?url' })` over the shared `data/` dir (the glob enumerates bin extensions so the `.md`/`.html` docs there aren't picked up): Vite fingerprints each file and hands the client its URL, so there's no manifest — drop a file in and it appears. A type-aware viewer renders by **content type** (inferred from the extension): **txt** as-is, **fb2** as a readable book with a saved scroll position, images/audio/video as native elements, anything else as a download link. A trailing **`.gz` / `.gzip`** is a transparent compression layer, inflated in-browser via `DecompressionStream` and independent of type (so `foo.txt.gzip` is a gzipped txt). Use the **`.gzip`** extension (not `.gz`) so servers don't force `Content-Encoding` — we inflate the bytes ourselves.

Styling is Tailwind v4 + daisyUI v5, with a light/dark theme toggle.

## The backend (`runtime/`)

A tiny, framework-free Node.js server in **TypeScript** — ESM, run directly via native type stripping (`--experimental-strip-types`, no build step), typechecked with **TypeScript 7**.

- **Serves the app + API on one origin.** In prod, one process serves the built frontend (`frontend/dist`) for every non-`/api` GET plus the `/api/*` routes on one port (`PORT`/`BIND_HOST` configurable; prod binds `0.0.0.0:80` behind Cloudflare for TLS). The static bundle needs no auth.
- **`/api/ws` — the WebSocket exchange.** A dumb meeting point: each client joins a **room** chosen by the **token** it presents on connect — the token *is* the room key, with no server-side registry. Same-room clients get join/leave presence and DM each other by a unique auto-assigned name; different rooms are mutually invisible; **a connection with no token is refused**; a room is freed when its last client leaves. The token rides in the `Sec-WebSocket-Protocol` header, an `x-ws-channel` header, or `?channel=`.
- **tasks, scheduler & services** — the automation layer, split by lifecycle: **tasks** are finite (the scheduler fires them on a cadence), **services** are long-running processes the service manager supervises. Route recurring work through these, not a system cron or `nohup`.
## MCP servers (`mcp-servers/`)

Standalone Model Context Protocol servers for an assistant's external I/O — **telegram** (read/search a TG account over MTProto), **gmail**, **gcal** (read-only), **digitalocean** (manage droplets). Each has its own `README.md` + `.env.example`; registered in [`.mcp.json`](.mcp.json).

> **Secrets** live only in git-ignored `.env` files (plus TG session strings / Google service-account keys) — never committed. The `.env.example` files are placeholders.

## Layout

```
ocraft/
  frontend/           # the app (Vite + Vue 3 + Tailwind/daisyUI)
    data/             #   flat content dir — docs (*.html/*.md), bins (media/gz), refactory *.txt
    scripts/          #   runnable experiments — *.vue / *.ts / *.jsx (Vue / vanilla / Solid)
    src/              #   App.vue (router + sidebar) + AssetView.vue (bin viewer) + fb2.ts
    vite.config.ts    #   dev-only /__save-doc middleware for in-app doc editing
  runtime/            # Node/TS backend — api.ts (serves app + /api) + wsServer.ts (/api/ws rooms)
                      #   + cli.ts + tasks/ + services/ + scheduler
  mcp-servers/        # Telegram / Gmail / GCal / DigitalOcean MCP servers
  plans/              # longer-form design notes, roadmap, rejected/out-of-scope
  CLAUDE.md           # pointer to this README (working rules live below)
```

## Working in this repo

Working rules — follow them when editing here. Everything is **TypeScript** (ESM; the backend runs via native type stripping, the frontend via Vite):

- **TypeScript `.ts` / `.vue`, never `.mjs`.** Every package is ESM (`"type": "module"`).
- **Develop on `main` — no feature branches.** Build directly on `main`; don't `git checkout -b`.
- **No single-letter names** except `i`/`j`/`k` as numeric loop counters. Every binding — including `.map`/`.filter`/`.find` args and regex matches — gets a name that says what it *is*.
- **No boolean flag parameters.** `fn(…, true)` is opaque — split into two intention-named functions (`editRich()` / `editSource()`) or a named mode.
- **Simplest condition that reads plainly — don't over-guard.** Destructure up front, then test the fields. Guard the failure that can *actually* occur (missing / zero / empty), not impossible inputs. If you deviate for a real reason, say why in one line.
- **No chained ternaries** — one flat `?:` max, and only for a trivial value pick.
- **No unsolicited comments in doc bodies** — content only; pull the current body before patching it.
- **Frontend UI = Tailwind v4 + daisyUI v5 classes.** Action buttons use daisyUI `btn` classes; no hand-rolled button styling.- **Automate through ocraft's own runtime** — recurring work is a scheduler **task** (`runtime/tasks/<name>.ts` wired into `runtime/scheduler.ts`), a long-running process is a **service** (`runtime/services/`), a one-off is `npm run cli -- run <name>`. Not a system cron, `nohup`, or a hand-rolled systemd unit.

## Direction

A local-first personal knowledge + scripts workspace: docs are the durable, link-organized memory; scripts are runnable tools beside them; bins hold data. The runtime supplies the WS exchange, automation, and MCP I/O; an assistant supplies the language/judgment step. Longer-form notes live in `plans/`.

## License

[MIT](LICENSE) © 2026 Nick Aliferov.

## Roadmap · Rejected / out-of-scope

The roadmap and the cut/parked ideas (with the *why* for each — check it before proposing features) live in **[plans/](plans/)** (`roadmap.txt`, `rejected-out-of-scope.txt`).
