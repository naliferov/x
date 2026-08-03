## prefuse-style glitch chopping — tools & primitives

The aesthetic = **MPC-style sample chopping + micro-edits + stutter/ratchet retriggers + granular clouds + bitcrush/downsample + gated rhythmic gating + probability-driven variation**. Every tool below is just a different way to get those primitives.

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
