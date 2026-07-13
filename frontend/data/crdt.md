**Tombstone** - a marker recording that an element was deleted; deferred physical deletion (kept as a "deletion marker", not removed immediately).

**Op-based (CmRDT)** - operations carry ordering/causality (e.g. logical clocks), so they apply correctly without storing a version per replica.

- **Causal delivery:** if op A depends on B, every node sees B before A - via reliable causal broadcast (carries vector clocks / dependency ids).
- Vector clock, 3 nodes → `[2, 5, 3]` = node1 did 2 events, node2 5, node3 3.
- **Delivery rule** (op from sender k, checked at a replica): `L` = local time vector (`L[i]` = ops from node i already applied here); `v` = vector arriving with the op (`v[i]` = ops from i the sender considered done).
  - sender: `L[k] == v[k]-1` (all prior ops from k applied; `v[k]=2` needs `L[k]=1`).
  - others (i≠k): `L[i] >= v[i]` (all ops from i the sender saw are already here).
  - replica B bumps `L[B]` only when it generates its own op.
- **Operation log** - records the op sequence → replication + debugging/recovery.
- **Prepare/effector** - a prepare phase generates the op, the effector applies it on all nodes → convergence.

```json
{ "id": "node1_id", "value": "objectData", "prev": null, "next": "node2_id", "internal": "node3" }
```

**State-based (CvRDT)** - send the whole structure (e.g. the entire list), not individual updates; the structure must support a merge.

**Types:** G-Counter (grow-only) · PN-Counter (inc/dec) · LWW-Register (last-writer-wins) · MV-Register (multi-value) · G-Set (no removal) · 2P-Set (priority removal) · PN-Set (add/remove counter) · LWW-Set (op-time priority) · OR-Set (observed-remove, with ids).

**Math foundation:** idempotence (dup-update protection) · commutativity (order-independent) · partial order (reflexive + transitive + antisymmetric) · semilattice (poset with a least-upper / greatest-lower bound) · version vector (dim = #nodes; each node increments its own on an event; sync tells which replica is old/new). Key idea: ops must be **commutative + associative** → apply-order can't affect final state; semilattices formalize it.

**Reliable delivery:** ordered → concurrent effectors commutative · unordered → all effectors commutative · possibly-repeated → must be idempotent · some use queues (Kafka).

**Related:** RSM (replicated state machines) · OT (operational transformation - consistency for collab editors: Google Docs, Office) · DVCS (distributed VCS). Consistency levels: Strong / Eventual / Strong-Eventual.

[crdt vs OT](https://thom.ee/blog/crdt-vs-operational-transformation) · [INRIA paper](https://inria.hal.science/inria-00629503/document) · [state-based CRDTs](https://www.bartoszsypytkowski.com/the-state-of-a-state-based-crdts/)
