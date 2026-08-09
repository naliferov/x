**AI**

aider  
minimax

pi.dev

## infrastructure as code

Terraform remains the most popular tool for describing infrastructure (cloud resources, VMs, networks, etc.) declaratively  
  
**Pulumi** lets you describe resources in Python, TypeScript, Go, or C# – that is, using an ordinary programming language instead of declarative HCL. OpenTofu

## libs

effect.js rxjs quokkajs prototype and testing tool for js, ts  
  
**animation** [https://gsap.com](https://gsap.com)  
  
**processing.js** [https://processing.org](https://processing.org)  
  
**state** [reatom](https://www.reatom.dev) [xstate](https://stately.ai/docs/xstate)  
  
**web worker** [https://partytown.qwik.dev](https://partytown.qwik.dev)

## js frameworks

angular react solid svelte alpinejs  
  
astro elysiajs encore hono htmx qwik

## css

**flex - wrap to next line**

```css
flex: 1 0 100%;
```

## web

**supabase** - db pull / migrate → session pooler (5432) runtime → transaction pooler (6543)  
  
bestofjs [https://github.com/sindresorhus/awesome](https://github.com/sindresorhus/awesome)  
  
[https://posthog.com](https://posthog.com/)  
[https://boosteroid.com](https://boosteroid.com)  
[http://plaintext.ing](http://plaintext.ing)  
[https://pixeliconlibrary.com](https://pixeliconlibrary.com)

## infra & services

**proxy** [https://www.envoyproxy.io](https://www.envoyproxy.io) **Ambient Mesh** splits functions between an L4 proxy (ztunnel, written in Rust) and an L7 proxy, removing the unnecessary sidecars  
  
Cloudflare Workers  
  
**REST API testing** postman [https://hoppscotch.com](https://hoppscotch.com)  
  
**Service communication** **network mesh solutions** play an important role here, and there are innovations in this area too. The classic service mesh (Istio, Linkerd) involves running a sidecar proxy container next to each service to intercept and route traffic. However, a **sidecar-less service mesh** is now being offered: for example, in 2022 Istio Ambient Mesh was announced – a mode of mesh operation without sidecars that intercepts traffic at the node level using eBPF and special node proxies such as ztunnel​ istio.io. In Ambient Mesh, a single shared layer on the node serves all applications at once, which reduces overhead and simplifies the adoption of security and observability.  
  
**terminal** [https://www.warp.dev](https://www.warp.dev) [https://ghostty.org](https://ghostty.org) [https://fishshell.com](https://fishshell.com)  
  
**Queue, Stream** RabbitMQ, Kafka, Redpanda, NATS JetStream  
  
**self-hosting** , **local dev** [https://caddyserver.com](https://caddyserver.com) [https://caprover.com](https://caprover.com) [https://coolify.io](https://coolify.io) ngrok [https://dokku.com](https://dokku.com) [https://railway.com](https://railway.com)  
  
**System design** One of the notable trends is the **MACH** architecture (Microservices, API-first, Cloud-native, Headless) Data Mesh, Data Lakehouse (In essence, a lakehouse lets you run SQL analytics and machine learning directly on cheap object storage (for example, a data lake in S3), but with support for ACID transactions and a unified metadata management layer.)
