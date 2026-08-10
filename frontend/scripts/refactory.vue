<script setup lang="ts">
// refactory — the vlang stage + editor app.
//
// keywords: p page · o object · i image · v video · tx text ("string" in quotes)
// params are grouped per type (see the *Params fns below):
//   common (all):  x/y position · w/h size · b background
//                  t schedule: t<start> · t<start>:<end> · t<start>+<len> · t> (after prev)
//                  m motion, bare parts joined by '-': x px/s · y px/s · r deg/s
//   p page:        + d duration s (enables render)
//   v video:       + c cut (source seconds: c<start>:<end> or c<start>+<len>) · bare s sound
//   tx text:       + s<N> font size · c color (cblack / c#fff)
// - t> — start when the previous window ends; duration = the element's own cut length (c695:720 → 25s)
// - t>5 — after previous, explicit 5s (needed for images/rects, or to override)
// - absolute t5:8 still works and also advances the time cursor
// - i<id>/v<id> pull media from x nodes via the /api proxy; i<name>/v<name> from /api/bin
//
// Sources: plain files in frontend/data/*.txt, loaded by NAME (refactory-demo lives there).
// No node ids. Media inside a program (i<id>/v<name>) still resolves via the /api proxy.
import { ref, onMounted, onUnmounted } from 'vue'

const localSources = import.meta.glob('../data/*.txt', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>
const localNames = Object.keys(localSources).map((p) => ({
  path: p,
  name: p.split('/').pop()!.replace(/\.txt$/, ''),
}))

const createStage = (host: HTMLElement, controlsHost: HTMLElement, src: string) => {
  let canvas: HTMLCanvasElement | null = null
  let ctx: CanvasRenderingContext2D = null as any
  let p: any = null // the page { w, h, bg, d } — set by the p instruction
  let fitObserver: ResizeObserver | null = null
  const items: any[] = [] // draw list, in program order

  const defaults = () => ({
    x: 0, y: 0, w: 0, h: 0, bg: null, d: 0, mx: 0, my: 0, r: 0, c: null, t: null, s: false, size: 0, color: null,
  })

  // parse a time span (seconds) shared by t (schedule) and c (cut): start[:end], start+len,
  // or — when openEnd — a bare start (end null). '+len' is sugar for end = start + len.
  const parseTimeSpan = (letter: string, spec: string, openEnd: boolean) => {
    const shape = openEnd ? /^\d+(\.\d+)?([:+]\d+(\.\d+)?)?$/ : /^\d+(\.\d+)?[:+]\d+(\.\d+)?$/
    if (!shape.test(spec)) {
      const forms = openEnd
        ? `${letter}<start>, ${letter}<start>:<end>, or ${letter}<start>+<len>`
        : `${letter}<start>:<end> or ${letter}<start>+<len>`
      throw new Error(`bad ${letter} format "${letter}${spec}" — use ${forms}`)
    }
    if (spec.includes('+')) {
      const [start, len] = spec.split('+').map(Number)
      return { start, end: start + len }
    }
    const [start, end] = spec.split(':').map(Number)
    return { start, end: end === undefined ? null : end }
  }

  // params shared by every element: position (x/y), size (w/h), motion (m), schedule (t),
  // background (b). A per-type parser handles its own letters, then delegates the rest here;
  // an unknown token throws.
  const common = (parsed: any, token: string) => {
    if (token[0] === 'm') {
      // one m prefixes the whole token; parts are bare, split on '-' only before a
      // letter so negative numbers survive: mx10-y-15 = m(x10, y-15)
      for (const part of token.slice(1).split(/-(?=[a-z])/)) {
        if (part[0] === 'x') parsed.mx = Number(part.slice(1))
        else if (part[0] === 'y') parsed.my = Number(part.slice(1))
        else if (part[0] === 'r') parsed.r = Number(part.slice(1))
        else throw new Error(`unknown motion param "${part}"`)
      }
    } else if (token.startsWith('t>')) {
      parsed.t = { after: true, dur: token.length > 2 ? Number(token.slice(2)) : null }
    } else if (token[0] === 't') {
      parsed.t = parseTimeSpan('t', token.slice(1), true) // open end allowed: bare t1
    } else if (token[0] === 'x') parsed.x = Number(token.slice(1))
    else if (token[0] === 'y') parsed.y = Number(token.slice(1))
    else if (token[0] === 'w') parsed.w = Number(token.slice(1))
    else if (token[0] === 'h') parsed.h = Number(token.slice(1))
    else if (token[0] === 'b') parsed.bg = token.slice(1)
    else throw new Error(`unknown param "${token}"`)
  }

  // page (p): + d duration
  const pageParams = (tokens: string[]) => {
    const parsed = defaults()
    for (const token of tokens) {
      if (token[0] === 'd') parsed.d = Number(token.slice(1))
      else common(parsed, token)
    }
    return parsed
  }

  // rect (o) and image (i): only the common params
  const plainParams = (tokens: string[]) => {
    const parsed = defaults()
    for (const token of tokens) common(parsed, token)
    return parsed
  }

  // video (v): + bare s sound, + c cut (video source seconds start:end)
  const videoParams = (tokens: string[]) => {
    const parsed = defaults()
    for (const token of tokens) {
      if (token === 's') parsed.s = true
      else if (token[0] === 'c') {
        parsed.c = parseTimeSpan('c', token.slice(1), false) // cut must be finite: no bare c10
      } else common(parsed, token)
    }
    return parsed
  }

  // text (tx): + s<N> font size, + c color
  const textParams = (tokens: string[]) => {
    const parsed = defaults()
    for (const token of tokens) {
      if (token[0] === 's') parsed.size = Number(token.slice(1))
      else if (token[0] === 'c') parsed.color = token.slice(1)
      else common(parsed, token)
    }
    return parsed
  }

  const place = (kind: string, el: any, opts: any) => {
    if (!canvas) throw new Error('p w<N> h<N> must come first')
    if (!opts.w && !el) throw new Error('w<N> required')
    const autoW = !opts.w // media falls back to the source's natural width once loaded (see draw)
    const autoH = !opts.h // media resolves it from the source aspect once loaded (see draw)
    if (autoH) opts.h = opts.w
    items.push({ kind, el, autoW, autoH, ...opts })
  }

  const page = (opts: any) => {
    if (!opts.w || !opts.h) throw new Error('page needs both sizes: p w<N> h<N>')
    p = { w: opts.w, h: opts.h, bg: opts.bg ?? '#0f0f0f', d: opts.d }
    canvas = document.createElement('canvas')
    canvas.className = 'rounded border border-base-300'
    // vlang units are logical: backing store scaled by devicePixelRatio, drawn 1:1
    const dpr = window.devicePixelRatio || 1
    canvas.width = p.w * dpr
    canvas.height = p.h * dpr
    ctx = canvas.getContext('2d')!
    ctx.scale(dpr, dpr)
    host.append(canvas)

    // The stage box owns the height; the canvas is scaled down to fit it (never up past the
    // page's own logical size) and its width follows, so the column claims no more than it draws.
    const el = canvas
    const fit = () => {
      const scale = Math.min(host.clientHeight / p.h, 1)
      const width = `${Math.round(p.w * scale)}px`
      if (el.style.width !== width) {
        el.style.width = width
        el.style.height = `${Math.round(p.h * scale)}px`
      }
    }
    fit()
    fitObserver = new ResizeObserver(fit)
    fitObserver.observe(host)
  }

  const object = (opts: any) => {
    place('rect', null, opts)
  }

  const text = (opts: any) => {
    if (!canvas) throw new Error('p w<N> h<N> must come first')
    if (!opts.text) throw new Error('tx needs its text in quotes: tx x0 y0 s20 cwhite "hello"')
    // w/h are measured each frame from the font (see draw) so motion/rotation work uniformly
    items.push({ kind: 'text', el: null, autoH: false, ...opts, size: opts.size || 20 })
  }

  const image = (src: string, opts: any) => {
    const img = new Image()
    img.src = src
    place('image', img, opts)
  }

  const video = (src: string, opts: any) => {
    const vid = document.createElement('video')
    vid.src = src
    vid.muted = !opts.s
    vid.playsInline = true
    place('video', vid, opts)
  }

  const exec = (line: string) => {
    // pull a "quoted" text literal out first so its spaces aren't tokenized as params
    const quote = line.match(/"([^"]*)"/)
    const bare = quote ? line.replace(quote[0], '') : line
    const [keyword, ...tokens] = bare.split(/\s+/).filter(Boolean)

    try {
      if (keyword === 'p') page(pageParams(tokens))
      else if (keyword === 'tx') text({ ...textParams(tokens), text: quote ? quote[1] : '' })
      else if (/^i[\w-]+$/.test(keyword)) image(`/api/bin/${keyword.slice(1)}`, plainParams(tokens))
      else if (/^v[\w-]+$/.test(keyword)) video(`/api/bin/${keyword.slice(1)}`, videoParams(tokens))
      else if (/^o\d*$/.test(keyword)) object(plainParams(tokens))
      else throw new Error('unknown instruction')
    } catch (err: any) {
      throw new Error(`${err.message} — line: "${line}"`)
    }
  }

  // closed-form motion: position derives from elapsed time, so the clock can be paused
  // and reset (render), and wrapping works in BOTH directions (negative speeds)
  const wrapPos = (base: number, size: number, speed: number, elapsed: number, pageSize: number) => {
    if (!speed) {
      return base
    }
    const travel = pageSize + size // one full loop: page plus the element's own size
    const shifted = base + size + speed * elapsed // position in loop-space, 0 = fully off-screen before the page
    const wrapped = ((shifted % travel) + travel) % travel // positive modulo — works for negative speeds too
    return wrapped - size // back to page coordinates
  }

  const draw = (elapsed: number) => {
    ctx.fillStyle = p.bg
    ctx.fillRect(0, 0, p.w, p.h)
    for (const it of items) {
      if (it.t && (elapsed < it.t.start || (it.t.end !== null && elapsed >= it.t.end))) {
        continue
      }
      if ((it.autoW || it.autoH) && it.el) {
        const srcW = it.el.videoWidth || it.el.naturalWidth
        const srcH = it.el.videoHeight || it.el.naturalHeight
        if (srcW) {
          if (it.autoW) it.w = srcW
          if (it.autoH) it.h = (it.w * srcH) / srcW
        }
      }
      if (it.kind === 'text') {
        ctx.font = `${it.size}px sans-serif`
        it.w = ctx.measureText(it.text).width // so (x,y) anchors top-left, like a rect
        it.h = it.size
      }
      const px = wrapPos(it.x, it.w, it.mx, elapsed, p.w)
      const py = wrapPos(it.y, it.h, it.my, elapsed, p.h)
      const halfW = it.w / 2
      const halfH = it.h / 2
      ctx.save()
      ctx.translate(px + halfW, py + halfH)
      ctx.rotate((it.r * elapsed * Math.PI) / 180)
      const imageReady = it.kind === 'image' && it.el.complete
      const videoReady = it.kind === 'video' && it.el.readyState >= 2
      if (it.kind === 'rect') {
        ctx.fillStyle = it.bg ?? '#888'
        ctx.fillRect(-halfW, -halfH, it.w, it.h)
      } else if (it.kind === 'text') {
        ctx.fillStyle = it.color ?? '#fff'
        ctx.font = `${it.size}px sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(it.text, 0, 0)
      } else if (imageReady || videoReady) {
        ctx.drawImage(it.el, -halfW, -halfH, it.w, it.h)
      }
      ctx.restore()
    }
  }

  const clock = () => {
    let raf: number | null = null
    let last = performance.now()
    let elapsed = 0
    let playing = true
    const videos = items.filter((it) => it.kind === 'video')

    const tick = (now: number) => {
      const dt = (now - last) / 1000
      last = now
      if (playing) {
        elapsed += dt
      }
      for (const it of videos) {
        if (it.c && it.el.currentTime >= (it.c.end ?? Infinity)) {
          it.el.currentTime = it.c.start // loop the cut
        }
        if (it.t) {
          const visible = elapsed >= it.t.start && (it.t.end === null || elapsed < it.t.end)
          if (visible && !it.wasVisible && it.c) {
            it.el.currentTime = it.c.start // window opened — start the cut from its first frame
          }
          it.wasVisible = visible
          if (it.s) {
            it.el.muted = !visible // audio follows the schedule window
          }
        }
      }
      draw(elapsed)
      raf = requestAnimationFrame(tick)
    }

    const play = () => {
      playing = true
      for (const it of videos) {
        if (it.c && it.el.currentTime < it.c.start) {
          it.el.currentTime = it.c.start
        }
        // unmuted autoplay can be rejected before any user gesture — fall back to muted
        it.el.play().catch(() => {
          it.el.muted = true
          it.el.play()
        })
      }
    }
    const pause = () => {
      playing = false
      for (const it of videos) {
        it.el.pause()
      }
    }
    // jump the whole stage to second T: visuals derive from elapsed (closed-form), videos
    // get their internal clock aligned — cut start + time since their window opened,
    // folded into the cut length (they loop)
    const seek = (T: number) => {
      elapsed = T
      for (const it of videos) {
        const local = Math.max(0, T - (it.t ? it.t.start : 0))
        const start = it.c ? it.c.start : 0
        if (it.c && it.c.end !== null) {
          const len = it.c.end - it.c.start
          it.el.currentTime = start + (len > 0 ? local % len : 0)
        } else {
          it.el.currentTime = start + local
        }
      }
    }
    const reset = () => {
      seek(0)
    }

    const button = (label: string, onClick: () => void) => {
      const btn = document.createElement('button')
      btn.textContent = label
      btn.className = 'btn btn-sm'
      btn.onclick = onClick
      controlsHost.append(btn)
      return btn
    }

    const pauseBtn = button('pause', () => {
      if (playing) {
        pause()
        pauseBtn.textContent = 'play'
      } else {
        play()
        pauseBtn.textContent = 'pause'
      }
    })

    const seekField = document.createElement('input')
    seekField.placeholder = 'seconds'
    seekField.title = 'jump to second'
    seekField.className = 'input input-sm input-bordered w-20'
    seekField.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        const T = Number(seekField.value)
        if (!Number.isNaN(T)) {
          seek(T)
        }
      }
    })
    controlsHost.append(seekField)

    if (p.d) {
      const renderBtn = button('render', () => {
        renderBtn.disabled = true
        reset()
        play()
        pauseBtn.textContent = 'pause'
        const stream = canvas!.captureStream(30)
        const rec = new MediaRecorder(stream, { mimeType: 'video/webm' })
        const chunks: Blob[] = []
        rec.ondataavailable = (e) => chunks.push(e.data)
        rec.onstop = () => {
          const a = document.createElement('a')
          a.href = URL.createObjectURL(new Blob(chunks, { type: 'video/webm' }))
          a.download = 'collage.webm'
          a.click()
          renderBtn.disabled = false
        }
        rec.start()
        setTimeout(() => rec.stop(), p.d * 1000)
      })
    }

    raf = requestAnimationFrame(tick)
    play()
    return () => {
      cancelAnimationFrame(raf!)
      fitObserver?.disconnect()
      pause()
      for (const it of videos) {
        // abort the network request too — a stalled load otherwise holds a connection
        it.el.removeAttribute('src')
        it.el.load()
      }
    }
  }

  const resolveSchedule = () => {
    let cursor = 0 // time cursor — latest end of all scheduled windows; t> chains from here
    for (const it of items) {
      if (it.t?.after) {
        const cutLength = it.c ? it.c.end - it.c.start : null
        const dur = it.t.dur ?? cutLength
        if (dur === null) {
          throw new Error('t> needs a duration (t>5) unless the element has a finite cut')
        }
        it.t = { start: cursor, end: cursor + dur }
      }
      if (it.t && it.t.end !== null) {
        cursor = Math.max(cursor, it.t.end)
      }
    }
  }

  for (const line of src.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('//'))) {
    exec(line)
  }
  if (!p) throw new Error('no page — start with p w<N> h<N>')
  resolveSchedule()
  return clock()
}

// --- app mode: load a vlang source by data-file NAME (frontend/data/*.txt), edit / save / run ---
// Sources are plain files. The buffer edits live; `run` re-renders the stage; `save` writes the
// buffer back to frontend/data/<name>.txt via the dev /__save-doc middleware (the same path the doc
// editor uses — .txt is a doc format now). Typing a new name then saving creates a new source.
const STORE_KEY = 'devlab.vlang-app.source' // last loaded file name — survives reloads
// starter state — small canvas so the stage is never blank (also a live tx demo)
const INIT_SRC = 'p w250 h250 b#1a1a1a\ntx x20 y110 s24 c#888 "vlang"'

const nameField = ref('')
const source = ref('')
const status = ref('')
const stageEl = ref<HTMLElement>()
const controlsEl = ref<HTMLElement>()

let stopStage: (() => void) | null = null

const rebuild = () => {
  if (stopStage) {
    stopStage()
    stopStage = null
  }
  stageEl.value!.replaceChildren()
  controlsEl.value!.replaceChildren()
  try {
    stopStage = createStage(stageEl.value!, controlsEl.value!, source.value)
  } catch (err: any) {
    status.value = err.message
  }
}

const load = (name: string) => {
  const entry = localNames.find((l) => l.name === name.trim())
  if (!entry) {
    status.value = `no data/${name.trim()}.txt — have: ${localNames.map((l) => l.name).join(', ') || '(none)'}`
    return
  }
  nameField.value = entry.name
  localStorage.setItem(STORE_KEY, entry.name)
  source.value = localSources[entry.path]
  status.value = `loaded ${entry.name}`
  rebuild()
}

const clear = () => {
  localStorage.removeItem(STORE_KEY)
  nameField.value = ''
  status.value = ''
  source.value = INIT_SRC
  rebuild()
}

// Persist the buffer to frontend/data/<name>.txt (dev only — the middleware isn't served in a build).
const canSave = import.meta.env.DEV
const save = async () => {
  const name = nameField.value.trim()
  if (!name) {
    status.value = 'name the file first, then save'
    return
  }
  try {
    const res = await fetch(`/__save-doc?name=${encodeURIComponent(name)}&ext=txt`, {
      method: 'POST',
      body: source.value,
    })
    if (!res.ok) throw new Error((await res.text()) || `save failed (${res.status})`)
    localStorage.setItem(STORE_KEY, name)
    status.value = `saved data/${name}.txt ✓`
  } catch (err: any) {
    status.value = err.message
  }
}

onMounted(() => {
  const remembered = localStorage.getItem(STORE_KEY)
  if (remembered && localNames.some((l) => l.name === remembered)) {
    load(remembered)
  } else if (localNames.some((l) => l.name === 'refactory-demo')) {
    load('refactory-demo')
  } else {
    source.value = INIT_SRC
    rebuild()
  }
})

onUnmounted(() => {
  if (stopStage) {
    stopStage()
  }
})
</script>

<template>
  <div class="flex h-full flex-col gap-3">
    <div class="flex flex-wrap items-center gap-2">
      <input
        v-model="nameField"
        name="vlang-source-name"
        list="vlang-sources"
        class="input input-sm input-bordered w-64"
        placeholder="data file name — Enter to load"
        @keydown.enter="load(nameField)"
      />
      <datalist id="vlang-sources">
        <option v-for="l in localNames" :key="l.path" :value="l.name" />
      </datalist>
      <button v-for="l in localNames" :key="l.path" class="btn btn-sm" @click="load(l.name)">
        {{ l.name }}
      </button>
    </div>
    <div class="flex min-h-0 flex-1 gap-3">
      <!-- no canvas (no p, or the program threw) = no stage: the column drops out and the editor takes the row -->
      <div class="flex min-h-0 shrink-0 flex-col gap-2 not-has-[canvas]:hidden">
        <div ref="stageEl" class="flex min-h-0 flex-1 items-stretch"></div>
        <div ref="controlsEl" class="flex shrink-0 items-center gap-2"></div>
      </div>
      <div class="flex min-h-0 min-w-[220px] flex-1 flex-col gap-2">
        <textarea
          v-model="source"
          name="vlang-source"
          spellcheck="false"
          class="textarea textarea-bordered min-h-0 w-full flex-1 resize-none font-mono text-[13.5px] leading-relaxed whitespace-pre"
          placeholder="load a source…"
          @keydown.ctrl.enter.prevent="rebuild"
          @keydown.meta.enter.prevent="rebuild"
        ></textarea>
        <div class="flex shrink-0 items-center gap-2">
          <button class="btn btn-sm btn-primary" @click="rebuild">run</button>
          <button v-if="canSave" class="btn btn-sm" @click="save">save</button>
          <button class="btn btn-sm" @click="clear">clear</button>
          <span class="text-sm opacity-60">{{ status }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
