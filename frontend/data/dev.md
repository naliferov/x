# dev

## AI

[context7](https://context7.com) - MCP server by Upstash: pulls version-specific library docs into the model's context, so it stops inventing APIs that never existed. Two tools - `resolve-library-id`, `query-docs`; run as `npx @upstash/context7-mcp`. Free without a key, the key only raises rate limits.

aider · minimax · pi.dev

## Инфраструктура

**Sidecar-less service mesh.** Классический mesh (Istio, Linkerd) ставит sidecar-прокси рядом с каждым сервисом. Istio Ambient Mesh (2022) разносит функции: L4-прокси `ztunnel` на Rust + L7-прокси, перехват на уровне ноды через eBPF. Один общий слой на ноду обслуживает все приложения сразу - меньше накладных расходов, проще внедрять безопасность и observability. Envoy - под капотом.

**Terraform** - стандарт декларативного описания инфраструктуры. **Pulumi** - то же на обычном языке (Python, TypeScript, Go, C#) вместо HCL. OpenTofu - форк.

**Data Lakehouse** - SQL-аналитика и ML прямо поверх дешёвого объектного хранилища (S3), но с ACID-транзакциями и единым слоем метаданных.

## Мелочи, которые каждый раз забываются

```css
/* flex - перенести на следующую строку */
flex: 1 0 100%;
```

**supabase** - db pull / migrate → session pooler (5432); runtime → transaction pooler (6543).

## Ссылки, которые открываю

[gsap](https://gsap.com) анимация · [processing](https://processing.org) · [reatom](https://www.reatom.dev) / [xstate](https://stately.ai/docs/xstate) состояние · [partytown](https://partytown.qwik.dev) web worker · [hoppscotch](https://hoppscotch.com) REST · [posthog](https://posthog.com) · [caddy](https://caddyserver.com) / [coolify](https://coolify.io) / [dokku](https://dokku.com) self-hosting · [ghostty](https://ghostty.org)
