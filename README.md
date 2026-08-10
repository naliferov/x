# x

Personal, local-first **offline knowledge + scripts app**: flat **docs**, runnable **scripts**, **bins** (binary assets) - discovered from disk, served by a framework-free Node.js backend. Navigate by **hyperlinks, not folders**; docs editable in place. Vue 3 + Vite + Tailwind/daisyUI over a Node.js/**TypeScript** runtime (ESM, native type stripping, no backend build step).

## The app (`frontend/`)

Vite SPA, no login. Sidebar = three kinds under one filter; the right pane runs or renders the selection. `/doc/<name>`, `/script/<name>`, `/bin/<name>` navigate without a reload and work as deep links. Kind is by extension, not folder - docs and bins share the flat `data/` dir.

| kind | where | discovered by |
| --- | --- | --- |
| docs | `data/*.{html,md,txt}` | `import.meta.glob` |
| scripts | `scripts/*.{vue,js,ts,jsx,tsx}` | `import.meta.glob` |
| bins | `data/`, bin extensions | `import.meta.glob(…, { query: '?url' })` |

- **docs** - md → html via `marked`, txt escaped in a `<pre>`, html raw; one pane for all. html only for what md can't hold: inline color, tables, embeds. **Flat namespace, no folders** - organize by hyperlinks + hand-curated index / hub docs (Maps of Content), so one doc sits under many indexes. Read-only when deployed; in dev *edit* opens the source and *save* writes the file back via a Vite middleware.
- **scripts** - runnable experiments; `.vue` = Vue component, `.js`/`.ts` = vanilla (`export default (host) => cleanup?`), `.jsx`/`.tsx` = Solid. Reuse = plain ES `import`. Some talk to the live backend (harness → `/api/claude`, ws testers → `/api/ws`).
- **bins** - Vite fingerprints each file and hands the client its URL, so there is no manifest: drop a file in and it appears. The viewer renders by content type - txt as-is, fb2 as a book with saved scroll position, image / audio / video native, anything else a download link. A trailing **`.gzip`** is a type-independent compression layer inflated in-browser via `DecompressionStream` (`foo.txt.gzip` = gzipped txt); `.gzip` not `.gz`, so servers don't force `Content-Encoding`.

Styling: Tailwind v4 + daisyUI v5, light/dark toggle.

## The backend (`runtime/`)

Framework-free Node.js server, **TypeScript** ESM, run via native type stripping (`--experimental-strip-types`, no build step), typechecked with TypeScript 7.

- **App + API on one origin, one port** (`PORT` / `BIND_HOST`; prod binds `0.0.0.0:80` behind Cloudflare for TLS): `frontend/dist` for every non-`/api` GET, plus `/api/*`. The static bundle needs no auth.
- **`/api/ws` - the WebSocket exchange.** A client joins the **room** named by the **token** it presents on connect - the token *is* the room key, no server-side registry. Same room → join/leave presence + DM by auto-assigned unique name; other rooms invisible; no token → refused; room freed with its last client. Token rides in `Sec-WebSocket-Protocol`, an `x-ws-channel` header, or `?channel=`.
- **tasks / scheduler / services** - automation by lifecycle: **tasks** finite, fired on a cadence; **services** long-running under the service manager. Recurring work goes here, not a system cron or `nohup`.

## MCP servers (`mcp-servers/`)

External I/O for an assistant: **telegram** (read/search over MTProto), **gmail**, **gcal** (read-only), **digitalocean** (droplets). Each has its own `README.md` + `.env.example`; registered in [`.mcp.json`](.mcp.json).

> **Secrets** live only in git-ignored `.env` files (plus TG session strings, Google service-account keys) - never committed. `.env.example` = placeholders.

## Layout

```
x/
  frontend/           # the app (Vite + Vue 3 + Tailwind/daisyUI)
    data/             #   flat content dir - docs (*.html/*.md/*.txt), bins (media/gz)
    scripts/          #   runnable experiments - *.vue / *.ts / *.jsx (Vue / vanilla / Solid)
    src/              #   App.vue (router + sidebar) + AssetView.vue (bin viewer) + fb2.ts
    vite.config.ts    #   dev-only /__save-doc middleware for in-app doc editing
  runtime/            # Node/TS backend - api.ts (serves app + /api) + wsServer.ts (/api/ws rooms)
                      #   + cli.ts + tasks/ + services/ + scheduler
  mcp-servers/        # Telegram / Gmail / GCal / DigitalOcean MCP servers
  plans/              # longer-form design notes, roadmap, rejected/out-of-scope
  CLAUDE.md           # pointer to this README (working rules live below)
```

## Working in this repo

Follow when editing. Everything is TypeScript + ESM.

- **`.ts` / `.vue`, never `.mjs`** - every package is `"type": "module"`.
- **Develop on `main`** - no feature branches, no `git checkout -b`.
- **No single-letter names** except `i`/`j`/`k` loop counters - `.map`/`.filter`/`.find` args and regex matches included.
- **No boolean flag parameters** - `fn(…, true)` is opaque; split into intention-named functions (`editRich()` / `editSource()`) or a named mode.
- **Simplest condition that reads plainly.** Destructure up front, then test the fields; guard the failure that can *actually* occur (missing / zero / empty), not impossible inputs. Deviate for a reason → say why in one line.
- **No chained ternaries** - one flat `?:`, trivial value picks only.
- **No unsolicited comments in doc bodies** - content only; pull the current body before patching it.
- **Frontend UI = Tailwind v4 + daisyUI v5 classes** - buttons use daisyUI `btn`, never hand-rolled styling.
- **Automate through x's own runtime** - recurring = a scheduler **task** (`runtime/tasks/<name>.ts` wired into `runtime/scheduler.ts`), long-running = a **service** (`runtime/services/`), one-off = `npm run cli -- run <name>`. Not a system cron, `nohup`, or a hand-rolled systemd unit.

## Direction

Docs = the durable, link-organized memory; scripts = runnable tools beside them; bins = data. The runtime supplies the WS exchange, automation and MCP I/O; an assistant supplies the language/judgment step. Longer-form notes live in `plans/`.

## License

[MIT](LICENSE) © 2026 Nick Aliferov.

## Roadmap · Rejected / out-of-scope

Roadmap + cut/parked ideas, with the *why* for each (check before proposing features): **[plans/](plans/)** - `roadmap.txt`, `rejected-out-of-scope.txt`.
