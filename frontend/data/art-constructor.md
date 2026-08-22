art constructor = gen of possibility space. design space things arise in. pick the min primitives.
relations of elements, not elements
lego: few element types + universal connector → huge space
go: 1 piece, 1 rule → enormous tree. power = joining interface / interaction rules. minimal system can beat a rich one: push complexity out elements to connections

-   **elements.**  how many types? homogeneous (voxel, go stone) vs heterogeneous (lego, chess). homogeneity + scale often beats variety
-   **connectors.**  universal (peg, grid-adjacency) → combinatorial explosion; typed (port in/out, node editors) → directed structure / pipeline. generativity is born here
-   **rules (dynamics)**  after joining. static (drawing) vs dynamic (game of life, factorio, redstone)
-   **flow** — does something flow through (signals, data)? if yes → structure becomes a program, creative act = designing flow transformations (factorio).
-   **constraints / scarcity** — limits that make choice meaningful. w/o them = arrangement, no tension. stravinsky: more constraints → more freedom.

combinatorial space ≠ meaningful space. random pixels = gigantic combinatorial, ~all meaningless; go = gigantic, ~all meaningful. **rules concentrate meaning, cut chaos**

-   **basis** — primitives form a basis of the space: minimal, independent, spanning. **finding the basis is the whole design problem.**

**interest scales exactly w/ how much the space exceeds what you explicitly put in.** static placement editor = weakest (aesthetics of arrangement). + rules + flow → mastery (space deeper than you) + surprise (system makes a 3rd thing from 2). music analog: alva noto = minimal creative system — **click + sine as basis** , structure as generator, infinite micro-variation from few rules over time (substrate = time). heart = basis + rules → space > sum of rooms.

## чужие уроки - пять строк

-   hydra: most portable model, `hydra-synth` npm.

## два правила движка

-   **every directed cycle must contain ≥1 unit-delay** (frame-delay register / `pre` in lustre / z⁻¹ in DSP), else deadlock. engine: detect cycles; legalize only thru an explicit feedback/delay node reading the previous frame. on GPU = ping-pong framebuffers.
-   **glitch-freedom needs a topo-sort every time** the graph branches into diamonds (node depends on 2 paths from a shared ancestor); skip it → intermittent hard-to-reproduce artifacts. cheap for small graphs — do it day one.
-   don't nest matryoshka; model a portal as a typed edge: "navigate camera/active context into space X," not "pass data." keeps the data graph acyclic + small; the navigation graph (spaces ↔ portals) = a separate, possibly-cyclic graph. **separating data/dependency graph from navigation graph = the key move** (different graphs over partly the same nodes).

## schema

```ts
type PortDir = 'in' | 'out';
type SignalType = 'texture' | 'signal' | 'geometry' | 'scalar' | 'trigger' | 'table';

interface Port {
  id: string;
  dir: PortDir;
  type: SignalType;        // for type-checked connections (baklavajs/Rete do this)
  multi?: boolean;         // multi-input (Composite/Merge) vs single
}

interface Node {
  id: string;
  kind: string;            // 'osc' | 'image' | 'fft' | 'cycleOnBeat' | 'feedback' | ...
  role: 'source' | 'transform' | 'combine' | 'sink' | 'convert';
  x: number; y: number;    // free coordinate (canvas)
  spaceId: string;         // which Space it lives in
  params: Record<string, unknown>;
  state: Record<string, unknown>;  // node-local memory (for 'pre'/feedback/cycles)
  ports: Port[];
  dirty: boolean;
  // behavior:
  cook(inputs): outputs;   // pure-ish per-tick evaluation
}

interface Edge {
  id: string;
  fromNode: string; fromPort: string;
  toNode: string;   toPort: string;
}

interface Portal {         // a navigation edge, NOT a data edge
  id: string;
  fromNode: string;        // a portal node/handle
  toSpace: string;         // target Space
  transition?: 'zoom' | 'cut' | 'fade';
}

interface Space {          // Scene in his Concept System
  id: string;
  name: string;
  nodes: string[];         // node ids
  edges: string[];
  camera: { x: number; y: number; zoom: number };
}
```

## phases

-   **phase 1 — minimal working signal graph.** graph store in TS (schema above); pull-based + dirty-flags: sinks pull every `requestAnimationFrame` ; topo-sort each space's subgraph + cook in order. 4–6 primitives ( `image/source` , `transform` , `color` , `blend` , `modulate` , `output` ). _threshold:_ 20-node graph holds steady 60fps, recomputes only dirty nodes.
-   **phase 2 — audio clock + beat-sync.** one transport/clock node over `AudioContext.currentTime` , two-clocks: 25ms interval, 100ms lookahead; BPM entered/tapped + ableton link. FFT (bass/mid/treble), RMS, onset, beat: continuous = pulled per frame; discrete beat/bar = pushed as a `trigger` . a `cycleOnBeat` node. _threshold:_ changes land within 1 frame of the beat at 120–160 BPM; tempo change doesn't break sync.
-   **phase 3 — feedback, generators, navigation.** feedback node (ping-pong framebuffers) + cycle rule; L-system node + CA/noise node with an expressive-range view; spaces + portals, portal transition animates the camera. _threshold:_ 2 spaces + a portal w/ animated transition; a feedback chain stays stable.
-   **phase 4 — sandbox for others.** serialize to a JSON-canvas-style doc; small curated primitive set, fixed palette (ikeda/alva noto monochrome + accent), beat-quantization on by default; MIDI-in + "anything-to-anything" modulation routing.
