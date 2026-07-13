art constructor = gen of possibility space. design space things arise in. pick the min primitives.   
relations of elements, not elements  
lego: few element types + universal connector → huge space  
go: 1 piece, 1 rule → enormous tree. power = joining interface / interaction rules. minimal system can beat a rich one: push complexity out elements to connections

-   **elements.**  how many types? homogeneous (voxel, go stone) vs heterogeneous (lego, chess). state? behavior? homogeneity + scale often beats variety
-   **connectors.**  universal (peg, grid-adjacency) → combinatorial explosion; typed (port in/out, node editors) → directed structure / pipeline. generativity is born here
-   **rules (dynamics)**  after joining. static (drawing) vs dynamic (game of life, factorio, redstone)
-   **substrate / topology** — the arena: grid? plane? graph? nesting? "rooms w/ passages" = a graph of spaces, each room its own substrate. sets which adjacencies/flows are possible.
-   **flow** — does something flow through (signals, data)? if yes → structure becomes a program, creative act = designing flow transformations (factorio). not mandatory; w/o it = static compositions.
-   **constraints / scarcity** — limits that make choice meaningful (few elements, little room, cost, conservation). w/o them = arrangement, no tension. stravinsky: more constraints → more freedom.
-   **feedback** — does the creator see what the composition does? instant feedback makes the space explorable, not blind.

size/navigability/surprise can't be designed directly

combinatorial space ≠ meaningful space. random pixels = gigantic combinatorial, ~all meaningless; go = gigantic, ~all meaningful. need structured generativity, not many combination. **rules concentrate meaning, cut chaos**

-   **orthogonality** — best primitives act independently → combinations multiply (a×b) not add; overlap = redundancy. each new primitive must buy a new dimension of expressiveness (= good api design).
-   **basis** — primitives form a basis of the space: minimal, independent, spanning (like a vector-space basis). **finding the basis is the whole design problem.**

**interest scales exactly w/ how much the space exceeds what you explicitly put in.** static placement editor = weakest (aesthetics of arrangement). + rules + flow → mastery (space deeper than you) + surprise (system makes a 3rd thing from 2); solutions get style. music analog: alva noto = minimal creative system — **click + sine as basis** , structure as generator, infinite micro-variation from few rules over time (substrate = time). heart = basis + rules → space > sum of rooms.

_build possibility space (signal-driven node graph)_

## tl;dr

-   **graph of typed nodes carrying signals.** touchdesigner lesson: right primitives = a few data families (image/texture, channel/control-signal, geometry, data/text) + explicit converter nodes. signal = medium; node = almost-pure fn w/ ports, state, behavior.
-   **drive everything from one global transport/clock** on web audio `AudioContext.currentTime` , "two clocks" lookahead scheduler; FFT/onset/beat nodes feed the graph. quantize visual events to the musical grid (= resolume/vdmx BPM-sync).
-   **hybrid substrate:** free 2D coords for layout (infinite canvas, tldraw/obsidian style) + typed graph for logic + "portals" as a separate edge type (teleport/nav, not nesting). web stack: rete.js or custom store + webgl (regl/three/pixijs/hydra-synth) + web audio clock.

## key takeaways

1.  **every serious node tool converges on a few typed data families + converter operators, not a flat node soup.** touchdesigner: 7 families — TOP (textures/images, GPU), CHOP (channels: audio/control/animation signals), POP/SOP (points/geometry), DAT (text/tables/scripts), MAT (materials), COMP (containers) + cross-family converters (TOP-to-CHOP, SOP-to-DAT). most important architectural lesson.
2.  **dominant model = pull-based (demand-driven) + dirty-flag, not push.** touchdesigner: input change marks a node dirty; cooks only when a sink (display) asks. blender rewrote geometry-nodes as a lazy-function system computing only needed data. output pulls per frame; only dirty subgraphs recompute.
3.  **CS theory is settled.** FRP gets glitch-freedom by topo-sorting the dependency DAG. lustre + SDF formalize multi-rate scheduling (audio/frame/event rate). hard feedback rule: **every cycle must contain ≥1 unit-delay** (frame-delay register / `pre` in lustre / z⁻¹ in DSP), else deadlock.
4.  **small primitive set → large meaningful (not just combinatorial) space only if primitives orthogonal/composable + rules concentrate meaning.** L-systems = alphabet + rules + axiom; expressive range (PCG) measures/tunes the space; "kaleidoscope effect" = high combinatorial capacity + low perceptual diversity = boring.
5.  **a graph can be both logic structure + navigable space; "portals" = a typed edge w/ teleport semantics.** spatial hypertext (VIKI) + zoomable UIs (pad++): free placement + links → emergent structure/nav. infinite-canvas engines (tldraw, obsidian canvas) store flat JSON (nodes w/ x,y + edges) in a reactive store → maps onto a coords+graph hybrid.

## details

### 1\. node-tool architecture — primitives + execution

**touchdesigner (reference).** operators (OP) = nodes; they "cook" → data. families: TOP (2D textures, GPU); CHOP (channels — samples for audio/animation/control/timing/logic/device I/O = the signal primitive); SOP/POP (3D geometry/points); DAT (text/tables/scripts/GLSL); MAT (materials/shaders); COMP (containers + sub-networks + UI). no silent cross-family flow — explicit converters (TOP-to-CHOP = pixels→channels, SOP-to-DAT = points→table).

**computation = pull + dirty-flags.** param change marks node dirty; cooks only when a downstream consumer (ultimately display pulling a frame) asks. cook needs (1) a request + (2) a reason (dirty). a few nodes (render TOP, device-in) "always cook" (monitoring inputs costs more than recomputing) — pragmatic exception worth copying.

**max/msp + pure data — two-rates lesson.** control rate (event scheduler, 1ms tick) + audio/signal rate (44.1/48 kHz, vectorized blocks = "signal vector size"). control msgs = discrete events thru patch cords; audio `signal` connections compile into a separate signal graph at audio rate. bridges `sig~` , `snapshot~` , `line~` convert rates. **lesson:** treat audio-rate analysis (FFT, envelope) as a separate rate domain from frame-rate (60fps) visuals + event-rate (beat/onset) triggers, w/ explicit sample/hold bridges.

**vvvv / houdini / blender.** vvvv: the spread (immutable dynamic 1-D array); nodes auto-process spreads element-wise = data parallelism (25-tree grid) w/o loops. houdini VOPs: visual graph compiles to executable VEX (graph + kernel = 2 views of one computation). blender 3.0+: lazy-function evaluator computes only needed in/out (switch computes only chosen branch); tree splits into data flow (geometry) + function flow (fields per-element, lazy).

**cables.gl — closest web analog.** patch-based: ops connected by typed ports + links; output change passes value to inputs, may trigger receiver. adds explicit trigger ports for imperative order on top of dataflow (push/trigger hybrid). compiles to webgl/webgpu, custom ops in JS. object model `core_patch.js` , `core_op.js` , `core_port.js` , `core_link.js` = a clean minimum to emulate.

**hydra (live-coding video synth) - function-chain.** analog-modular: start w/ a source ( `osc()` , `shape()` , `noise()` , `src()` ) + chain transforms ( `.rotate()` , `.kaleid()` , `.modulate()` , `.blend()` , `.diff()` ) → `.out(o0)` . 4 source buffers (s0–s3) + 4 output buffers (o0–o3), each a webgl framebuffer; each fn = a fragment-shader snippet, the chain compiles into one GLSL fragment shader. output buffers sample each other — `src(o0).modulate(o1)` → feedback/hall-of-mirrors. **most portable model.** `hydra-synth` = embeddable npm module.

**minimal node taxonomy everyone converges on:** sources/generators (no input: oscillator, noise, image, camera, constant), filters/transforms (1→1: rotate, blur, color, math), combiners (many→1: blend, composite, merge, modulate), sinks/outputs (pull the graph: render to screen/buffer/device), converters (type bridges). adopt these 5 roles as node super-types.

### 2\. dataflow + reactive models (theory)

**push vs pull.** push (data-driven) = eager forward from changed inputs; pull (demand-driven) = lazy recompute when output requested. conal elliott ("push-pull FRP"): combine — push for discrete events, pull for continuous behaviors. pragmatic (touchdesigner): pull-per-frame at sinks + dirty-flags to prune + push triggers for discrete musical events.

**glitch-freedom via topological order.** glitch = a node updating on mixed old/new inputs. avoid by processing the dependency graph in topo order. mandatory for diamond deps (node depends on 2 paths from a shared ancestor) — typical when one analysis node branches.

**lustre (synchronous dataflow lang).** every var = a flow (infinite value sequence + a clock). synchrony hypothesis: outputs computed in zero logical time. ops: `pre` (previous value), `->` (init/"followed-by"), `when` (sample onto slower clock), `current` (hold last value onto faster clock). compiles the declarative graph into one sequential reaction loop (mealy machine: read→compute→write) via topo sort. copy this: per-frame tick = one reaction.

**SDF + multi-rate scheduling.** SDF (lee & messerschmitt) fixes tokens each actor produces/consumes per firing → static periodic schedule at compile time. multirate natural (downsampler N→1, upsampler reverse); the repetition vector = firings per period to balance rates; graph consistent only if such a vector exists. **takeaway:** want determinism/precomputed schedule → fix I/O rates; want dynamics → kahn-style.

**KPN (kahn process networks).** deterministic concurrent runtime: sequential processes via unbounded FIFO channels, blocking reads + non-blocking writes, no peeking → message order independent of process speed/order. guarantees same result regardless of node eval order (good for reproducibility + save/replay). SDF = statically-scheduled special case of KPN.

**feedback/cycles — unit-delay rule.** theorem: **every directed cycle must contain ≥1 delay element** (one initial token / frame-delay register). lustre = `pre` ; DSP = z⁻¹; max/msp audio feedback thru `tapin~` / `tapout~` . **engine:** detect cycles; legalize only if thru an explicit feedback/delay node reading the previous frame. hydra does this implicitly: `o0` loops via `src(o0)` (previous frame's framebuffer).

### 3\. audio-reactive / rhythm-driven visuals

**analysis pipeline:** audio → features → visual params. features: FFT/spectral ( `AnalyserNode.getByteFrequencyData` / `Tone.Analyser` ) split bass/mid/treble; RMS/amplitude (envelope follower); onset (spectral flux); beat/tempo (BPM) via autocorrelation of the onset fn. FFT trade-off: more bins = longer window = more latency; small (32–128) react faster (beat detection), large (1024–2048) = finer spectrum.

**global clock/transport — cornerstone.** mandatory "two clocks" (chris wilson): precise audio clock = `AudioContext.currentTime` (sec, sample-accurate, separate thread); schedule via a `setTimeout` /worker lookahead loop. ~100ms lookahead, 25ms interval; each call schedules next 100ms. loop: `while (nextNoteTime < audioContext.currentTime + scheduleAheadTime) { scheduleNote(...); advance(); }` . libs: WAAClock, tone.js transport. **architecture:** one transport/clock node owns BPM + emits quantized ticks (16th, beat, bar, phrase); other nodes subscribe (= resolume's model).

**tempo-sync + image-on-beat.** global BPM (tapped/entered/ableton link/MIDI clock), clips/effects quantized to beats/bars/phrases (4 beats = bar, 8 bars = phrase). for "cycle images on beat": a cycle/sequencer node subscribes to beat events + advances an index over images. vdmx patches LFOs/envelopes "anything to anything" = the modular control-routing model.

**ableton link** = compatibility standard: syncs BPM + phase across apps on the LAN. support it → latch onto ableton sessions instead of audio analysis.

**feedback effects.** video feedback (framebuffer reads its own prev frame, transformed) = foundation of generative video. implement as ping-pong framebuffers (render into B while sampling A, swap) = GPU realization of the unit-delay-in-a-cycle rule. e.g. `o0` self-feedback (hydra), feedback TOP (touchdesigner).

### 4\. generative / emergent from minimal primitives

**good basis:** hydra's source/geometry/color/blend/modulate + touchdesigner families — any output feeds any same-type input (orthogonal, composable, closed). aim for the smallest set that spans your space.

**L-systems / generative grammars (trees/buildings).** L-system = symbol alphabet + parallel-rewriting rules + axiom → "complex structure from simple rules." graph grammars for non-linear structures. theme: parallel rewriting + a graphical interpretation step (string→geometry) = a tiny node pipeline.

**cellular automata + emergence.** minimal local rules → global complexity (conway's life, wolfram CA) = extreme "small rules, huge space"; great generator nodes for visuals.

**combinatorial vs meaningful space — central risk.** expressive range analysis: generate many artifacts, score w/ metrics (linearity/leniency/density), build a 2D histogram to _see_ what the generator produces. **"kaleidoscope effect":** huge numeric capacity can still be boring (hidden sameness precludes surprise) — perceptual uniqueness matters. **takeaway:** measure perceptual diversity, not combinatorial count; concentrate meaning w/ constraints/rules.

**constraints breed creativity.** ashby: "all order arises through constraint" → rationale for a minimal primitive set + a clocked/quantized system. ryoji ikeda: max sensory experience from pure data — binary b&w, grids, sine waves (datamatics, test pattern). factorio = interactive analog: simple components whose connections give complexity = a node graph.

### 5\. graph as navigable space + coords hybrid

**spatial hypertext.** VIKI "supports emergent qualities of structure" — visual-spatial metaphor expresses nuance, even ambiguous/forming structure. **free coordinate placement is itself meaningful** — clustering/position carry soft semantics, explicit edges carry hard logic.

**zoomable UI (ZUI).** pad++ — one large surface, docs placed/scaled freely; nav (pan/zoom/follow-link) smoothly animates to target. a spatial index culls invisible/too-small objects; fps stats drive level-of-detail. kidpad: animated portals > abrupt cuts ("zooming lets you keep your eyes open").

**infinite-canvas engines (impl template).** tldraw = flat JSON records in a reactive store ( `@tldraw/store` ); a shape = base props ( `x, y, rotation, opacity` ) + typed `props` , each type a `ShapeUtil` class (render, geometry/hit-test, interaction). its binding system keeps connection↔port synced as shapes move; tldraw's workflow starter kit = a node editor on canvas (nodes = custom shapes, connections = shapes bound to ports) — near-perfect coords+graph reference. obsidian canvas = open JSON canvas format: `nodes[]` ( `id, x, y, width, height, type` ) + `edges[]` ( `id, fromNode, fromSide, toNode, toSide` ) — dead-simple portable schema, adoptable wholesale.

**portals / link-as-teleport.** don't nest matryoshka; model a portal as a typed edge (or portal node): "navigate camera/active context into space X," not "pass data."

-   **space** (= scene in the ontology) — named container w/ own coord canvas + subgraph.
-   **portal** — edge of type `portal` w/ `{ from: nodeId, to: spaceId, transition }` ; transition animates the camera (pad++) or switches active space.
-   keeps the data graph acyclic + small; the navigation graph (spaces ↔ portals) = a separate, possibly-cyclic graph. **separating data/dependency graph from navigation graph = the key move** (different graphs over partly the same nodes).

### 6\. ontology + mapping (TS / web stack)

**node-editor libs:**

-   **rete.js** — TS-first, dataflow + control-flow, render plugins react/vue/angular/svelte (best for a built-in processing model).
-   **litegraph.js** — graph engine+editor, own canvas2d, exports JSON, self-contained (basis of comfyui).
-   **react flow / xyflow** — react render/interaction layer, NOT a computation engine (execution = yours).
-   **baklavajs** — graph/node editor, vue focus + separate engine.
-   **nodl** — small TS/RxJS reactive framework (data as observable streams), push-based FRP out of the box.

**recommendation:** for vue/TS + owning the model — either (a) build the graph store yourself (small; schema below) + a thin renderer (react flow/xyflow or baklavajs for vue, or tldraw for free infinite canvas + bindings), or (b) take rete.js. tldraw's workflow kit = canonical reference (coords+ports+bindings+execution together) even if unused.

**visual layer.** hydra-synth (npm) = modular video-synth out of the box (fastest audio-reactive path). more control: regl (functional stateless webgl, fits dataflow), pixijs (fast 2D sprite/filter — image cycling + 2D glitch), three.js (3D). raw webgl/webgpu fragment shaders = substrate; each transform node compiles to a shader pass; feedback nodes = ping-pong framebuffers.

**audio layer.** web audio api for capture + `AnalyserNode` for FFT/waveform; tone.js for `Transport` (musical time, BPM, quantized scheduling) + `Tone.Analyser` / `Tone.Meter` . wire: `AudioContext` → analysis nodes (FFT/onset/RMS) → "signal" nodes (CHOP analog); `Transport` /WAAClock → a clock node emitting quantized beat/bar events.

**stitching audio clock ↔ visual graph.** the clock (audio-thread precision) schedules discrete quantized events (beat, bar) via lookahead; the render loop ( `requestAnimationFrame` , ~60fps) pulls the visual graph every frame. continuous features (bass energy) sampled per frame (pull); discrete events (beat→image change) pushed by the clock as triggers. = max's control-rate/audio-rate bridge for the browser.

**layered ontology (data → structure → system → runtime):**

-   **data** = edge values: typed signals — `Texture` (GPU image/framebuffer), `Signal` / `Channel` (number or sample stream = CHOP analog), `Geometry` / `Points` , `Scalar/Vector` , `Trigger` / `Event` (discrete, beat-quantized), `Table/Text` . small closed type lattice + explicit converter nodes.
-   **structure** = the graph: `Node` , `Port` , `Edge` + `Space` (canvas/scene) + `Portal` (nav edge). static, serializable (JSON-canvas-style doc).
-   **system** = the engine: dirty-flag propagation, topo sort per space, pull-from-sinks scheduler, rate bridges, cycle/feedback legalization (delay nodes), transport/clock.
-   **runtime** = per-frame tick (lustre "reaction"): clock advances → scheduled events fire → render loop pulls active space's sinks → dirty subgraphs cook → frame shown. = your "HTML as runtime" instinct (space = DOM canvas, nodes = DOM elements w/ behavior, graph = file-like node model).

**node-with-behavior schema** (echo of the ocraft DOM-node model):

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

maps onto the concept-system ontology: **concept ≈ node-kind def** , **scene ≈ space** , **service ≈ a bridge node to the outside world** (audio device, MIDI, file, clock). mirrors JSON canvas + tldraw; adds `Port.type` , node-local `state` (the `pre` /delay rule), + a separate `Portal` / `Space` navigation layer.

## recommendations

**phase 1 — minimal working signal graph.**

-   build the graph store yourself in TS (schema above); render via tldraw (free canvas + ports + bindings + culling) or react flow/baklavajs.
-   pull-based + dirty-flags: sinks pull every `requestAnimationFrame` ; nodes dirty on param/edge change; topo-sort each space's subgraph + cook in order (→ glitch-freedom).
-   transform layer: hydra-synth or a small regl pipeline (1 shader pass per node); 4–6 primitives ( `image/source` , `transform` , `color` , `blend` , `modulate` , `output` ).
-   _threshold:_ 20-node graph holds steady 60fps, recomputes only dirty nodes.

**phase 2 — audio clock + beat-sync.**

-   one transport/clock node (tone.js transport or WAAClock over `AudioContext.currentTime` , two-clocks: 25ms interval, 100ms lookahead); expose BPM (entered/tapped) + ableton link.
-   analysis nodes: FFT (bass/mid/treble), RMS/envelope, onset (spectral flux), beat/BPM. continuous = pulled per frame; discrete beat/bar = pushed as a `trigger` .
-   a `cycleOnBeat` node (image index, beat/bar-quantized) → "change images on the beat."
-   _threshold:_ changes land within 1 frame of the beat at 120–160 BPM; tempo change doesn't break sync.

**phase 3 — feedback, generators, navigation.**

-   feedback node (ping-pong framebuffers) + cycle rule (reject cycles unless thru a delay/feedback node).
-   1–2 generators: L-system node (alphabet/rules/axiom → geometry) + CA/noise node; build an expressive-range view (sample many outputs, plot 2 metrics like density/complexity) to avoid the kaleidoscope effect.
-   spaces + portals: separate data graph (per space, acyclic) from navigation graph (spaces ↔ portals, may be cyclic); portal transition animates the camera (pad++ zoom).
-   _threshold:_ 2 spaces + a portal w/ animated transition; a feedback chain stays stable.

**phase 4 — sandbox for others.**

-   serialize to a JSON-canvas-style doc (portable, diffable).
-   constrain deliberately (stravinsky): small curated primitive set, fixed palette (ikeda/alva noto monochrome + accent), beat-quantization on by default.
-   add MIDI-in (webmidi) + an "anything-to-anything" modulation-routing UI (vdmx model).

**what would change this:** need guaranteed determinism/reproducibility (render-to-file, networked collab) → fixed-rate SDF or KPN instead of best-effort pull. perf on hundreds of nodes → move from per-node shader passes to one compiled shader per chain (hydra/houdini-VOP model): compile the graph to GLSL.

## caveats

-   **pull vs push = a real trade-off.** pure pull (touchdesigner) ideal for frame visuals, awkward for discrete events; pure push = opposite. you'll hit a hybrid (pull continuous, push triggers) — budget for bridge logic (subtle timing bugs live there).
-   **glitch-freedom needs a topo-sort every time** the graph/values branch into diamonds; skip it → intermittent hard-to-reproduce artifacts. cheap for small graphs — do it day one.
-   **web audio timing precision varies across browsers** (spectre/meltdown mitigations coarsen timer resolution); lookahead mitigates but doesn't eliminate jitter. test on target browser/OS.
-   **beat/onset detection imperfect on dense sub-heavy techno** ; multi-band onset helps, but for tightest sync prefer ableton link / MIDI clock over blind analysis when you're the source.
-   **huge meaningful space ≠ many primitives** — kaleidoscope effect is the central risk. validate w/ expressive-range analysis + lean on constraints; perceptual diversity, not combinatorial capacity.
