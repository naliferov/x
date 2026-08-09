## prefuse-style glitch chopping — tools & primitives

The aesthetic = **MPC-style sample chopping + micro-edits + stutter/ratchet retriggers + granular clouds + bitcrush/downsample + gated rhythmic gating + probability-driven variation**. Every tool below is just a different way to get those primitives.

i am working in: **min techno + glitch parts** + prefuse-style sample chopping.

### The reference shelf

**prefuse 73** — glitch-hop, chopped vocals, micro-edits, stutter; **blockhead** — lush, sample-based instrumental hip-hop.

Boom Bip, Dabrye, Flying Lotus, Daedelus — eccentric chopped LA beats.

- **Clark** (Warp) — harder, glitchy IDM edge
- **Telefon Tel Aviv** — glitch + lush vocal processing
- also: Jneiro Jarel, Take, Free The Robots

RJD2, DJ Shadow, Nujabes (jazzy), DJ Krush, Bonobo, Wax Tailor, Emancipator.

anticon (Boom Bip, Odd Nosdam, cLOUDDEAD), Warp (Clark, Bibio), Brainfeeder (FlyLo, Teebs), Ghostly (Dabrye).

### The search palette (reel / sample hunting)

kick, snare, clap, hats, perc, noise layer

**chopped/stuttered vocals:** vocal chop, vocal stutter, glitch vocal, chopped vox, granular vocal glitch textures

**micro-edits:** glitch, granular, clicks, stutter, buffer, idm texture

**broken/abstract beats:** broken beat, idm drums, wonky, abstract hip hop, dusty boom bap for the hip-hop bones

**warm jazz layers** (the teplo side): rhodes, vibraphone, jazz keys, dusty keys, jazz guitar, soul chops

**the grit:** lo-fi, tape, dusty, vinyl, cassette

### The core moves

- **Chop & rearrange** slices off a vocal/break
- **Stutter / ratchet** — retrigger a tiny grain rhythmically (the signature)
- **Granular** — overlapping grain clouds, reversed grains, pitch-smear
- **Buffer shuffle / beat-repeat**
- **Lo-fi** — bitcrush, sample-rate reduction, filtering
- **Randomized probability** on which slice, when, how loud, reversed-or-not

### Where each lives

#### Ableton + AbletonOSC — "Prefuse in a box"

- **Beat Repeat** — the stutter/glitch/ratchet device. Grid, chance, gate, pitch decimation.
- **Redux** (bitcrush/downsample) + **Grain Delay** (granular smear) + **Gate** + **Auto Filter**.
- **Simpler** in slice mode — chop the clip to transients/grid, trigger pads.
- Native randomization: note probability & velocity ranges (Live 11+), follow actions (random clip jumps), rack chain selectors, Max-for-Live LFO/randomizer.

Over **AbletonOSC** an agent can: set note probabilities, weight-randomize which slices fire, sequence the clip, and automate every Beat Repeat / Redux / Grain Delay parameter by prompt — but _cannot load_ those devices (you drop them on once). So: build the rack once, then drive the randomization and evolution live. Fastest path to the aesthetic if you stay in Ableton.

#### Max/MSP — total control

To _build_ the glitch engine: `buffer~` + `groove~` / `play~`, `gen~` for custom DSP, and especially `munger~` / `stutter~` from the **PeRColate** package — stochastic granular/stutter objects basically purpose-built for this style. Randomization objects: `drunk` (random walk), `urn` (no-repeat random), `prob`, `coll`-driven Markov. Most powerful, most work.

#### The Max video tool

Inside Max, video is **Jitter** (`jit.*` objects — playback, matrix processing, GL). On top of Jitter:

- **Vizzie** — modular, knob-based video toolkit (beginner-friendly, built into Max).
- **Vsynth** — a free package that turns Max into a modular analog-style video synth (likely the "tool for sequencing/processing video" — the popular one).
- For clip sequencing specifically, cue Jitter `jit.movie` / `jit.playlist`.
