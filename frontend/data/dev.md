**AI**

aider  
minimax

pi.dev

  
  
[infrastructure as code](/doc/infrastructure-as-code)  
  
[other libs](/doc/other-libs)  
  
**proxy** [https://www.envoyproxy.io](https://www.envoyproxy.io) **Ambient Mesh** splits functions between an L4 proxy (ztunnel, written in Rust) and an L7 proxy, removing the unnecessary sidecars  
  
Cloudflare Workers  
  
**REST API testing** postman [https://hoppscotch.com](https://hoppscotch.com)  
  
**Service communication** **network mesh solutions** play an important role here, and there are innovations in this area too. The classic service mesh (Istio, Linkerd) involves running a sidecar proxy container next to each service to intercept and route traffic. However, a **sidecar-less service mesh** is now being offered: for example, in 2022 Istio Ambient Mesh was announced – a mode of mesh operation without sidecars that intercepts traffic at the node level using eBPF and special node proxies such as ztunnel​ istio.io. In Ambient Mesh, a single shared layer on the node serves all applications at once, which reduces overhead and simplifies the adoption of security and observability.  
  
**terminal** [https://www.warp.dev](https://www.warp.dev) [https://ghostty.org](https://ghostty.org) [https://fishshell.com](https://fishshell.com)  
  
**Queue, Stream** RabbitMQ, Kafka, Redpanda, NATS JetStream  
  
**self-hosting** , **local dev** [https://caddyserver.com](https://caddyserver.com) [https://caprover.com](https://caprover.com) [https://coolify.io](https://coolify.io) ngrok [https://dokku.com](https://dokku.com) [https://railway.com](https://railway.com)  
  
**System design** One of the notable trends is the **MACH** architecture (Microservices, API-first, Cloud-native, Headless) Data Mesh, Data Lakehouse (In essence, a lakehouse lets you run SQL analytics and machine learning directly on cheap object storage (for example, a data lake in S3), but with support for ACID transactions and a unified metadata management layer.)
