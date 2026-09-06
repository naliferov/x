# x frontend

Scripts (runnable experiments) + docs (the knowledge base) in one offline app. Sidebar has
two sections — scripts and docs — with one filter; the right pane runs/renders the selection.
Flat structure: navigation is hyperlinks (`/doc/<name>`, `/script/<name>` — in-doc links
navigate in-app without a reload and work as deep links).

**Scripts** (`scripts/`) are `.vue` components, compiled by Vite. Cross-script reuse =
plain ES `import`. Styling = Tailwind v4 + daisyUI v5 classes.

**Docs** (`data/`), one file per doc, named by doc name — the name IS the route
(`/doc/<name>`). Told apart by extension: `.md` (41) and `.txt` (1).
Anything else in the same dir is a **bin** (binary asset: audio, images, archives), and a
`.gz`/`.gzip` bin is inflated in the browser. No manifest, no ids — `import.meta.glob`
over `data/` discovers everything.

## Run

```
npm install
npm run dev        # http://localhost:5173
npm run build      # -> dist/ (fully static, docs bundled as lazy chunks)
npm run typecheck
```

Managed service: `npm run service -- start frontend` (from the repo root).

The `/api` + `/ws` dev proxies exist only for scripts that talk to a live x api
(harness, refactory media, the ws testers); everything else is fully offline.
