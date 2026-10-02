<script setup lang="ts">
// Photomontage on a canvas: images from frontend/data/ stacked as layers, each with its own position,
// scale, rotation, opacity and blend mode. A collage is saved as frontend/data/<name>.collage.json and
// points at images by bin name; export renders the same canvas, without the selection frame, to a PNG.
// Drag moves a layer, wheel scales it, shift+wheel rotates it.
import { ref, computed, watch, onMounted } from 'vue'

type Layer = {
  image: string
  x: number
  y: number
  scale: number
  rotation: number
  opacity: number
  blend: GlobalCompositeOperation
}
type Collage = { width: number; height: number; background: string; layers: Layer[] }

const STORE_KEY = 'x.collage' // last opened collage name, survives reloads
const blends: GlobalCompositeOperation[] = [
  'source-over',
  'multiply',
  'screen',
  'overlay',
  'darken',
  'lighten',
  'color-dodge',
  'color-burn',
  'hard-light',
  'soft-light',
  'difference',
  'exclusion',
  'hue',
  'saturation',
  'color',
  'luminosity',
]
const formats = [
  { label: '4:5', width: 1080, height: 1350 },
  { label: '9:16', width: 1080, height: 1920 },
  { label: '1:1', width: 1080, height: 1080 },
]

const fileName = (path: string) => path.split('/').pop()!
const imageUrls = import.meta.glob('../data/*.{png,jpg,jpeg,gif,webp,avif,svg}', {
  query: '?url',
  import: 'default',
  eager: true,
}) as Record<string, string>
const layoutUrls = import.meta.glob('../data/*.collage.json', {
  query: '?url',
  import: 'default',
  eager: true,
}) as Record<string, string>

const images = Object.entries(imageUrls)
  .map(([path, url]) => ({ name: fileName(path).replace(/\.[^.]+$/, ''), url }))
  .sort((left, right) => left.name.localeCompare(right.name))
const layouts = ref(
  Object.entries(layoutUrls).map(([path, url]) => ({
    name: fileName(path).replace(/\.collage\.json$/, ''),
    url,
  })),
)

const blank = (): Collage => ({ width: 1080, height: 1350, background: '#111111', layers: [] })

const name = ref('')
const collage = ref<Collage>(blank())
const selected = ref<number | null>(null)
const status = ref('')
const canvas = ref<HTMLCanvasElement>()
const canSave = import.meta.env.DEV

const selectedLayer = computed(() =>
  selected.value === null ? null : collage.value.layers[selected.value],
)
const format = computed({
  get: () => `${collage.value.width}x${collage.value.height}`,
  set: (value: string) => {
    const [width, height] = value.split('x').map(Number)
    collage.value.width = width
    collage.value.height = height
  },
})

const elements = new Map<string, HTMLImageElement>()
const elementOf = (image: string) => {
  let element = elements.get(image)
  if (!element) {
    element = new Image()
    element.onload = () => render(canvas.value, true)
    element.src = images.find((candidate) => candidate.name === image)?.url ?? ''
    elements.set(image, element)
  }
  return element
}

const place = (context: CanvasRenderingContext2D, layer: Layer) => {
  context.translate(layer.x, layer.y)
  context.rotate((layer.rotation * Math.PI) / 180)
  context.scale(layer.scale, layer.scale)
}

const render = (target: HTMLCanvasElement | undefined, withFrame: boolean) => {
  if (!target) {
    return
  }
  const { width, height, background, layers } = collage.value
  if (target.width !== width || target.height !== height) {
    target.width = width
    target.height = height
  }
  const context = target.getContext('2d')!
  context.globalAlpha = 1
  context.globalCompositeOperation = 'source-over'
  context.fillStyle = background
  context.fillRect(0, 0, width, height)
  for (const layer of layers) {
    const element = elementOf(layer.image)
    if (!element.naturalWidth) {
      continue
    }
    context.save()
    context.globalAlpha = layer.opacity
    context.globalCompositeOperation = layer.blend
    place(context, layer)
    context.drawImage(element, -element.naturalWidth / 2, -element.naturalHeight / 2)
    context.restore()
  }
  const layer = withFrame ? selectedLayer.value : null
  if (layer) {
    const element = elementOf(layer.image)
    context.save()
    place(context, layer)
    context.lineWidth = 4 / layer.scale
    context.strokeStyle = '#3d7eff'
    context.strokeRect(
      -element.naturalWidth / 2,
      -element.naturalHeight / 2,
      element.naturalWidth,
      element.naturalHeight,
    )
    context.restore()
  }
}

watch([collage, selected], () => render(canvas.value, true), { deep: true })

// Pointer position in canvas pixels: the canvas is drawn at full size and shown scaled down.
const toCanvas = (event: MouseEvent) => {
  const rect = canvas.value!.getBoundingClientRect()
  return {
    x: ((event.clientX - rect.left) * collage.value.width) / rect.width,
    y: ((event.clientY - rect.top) * collage.value.height) / rect.height,
  }
}

const hits = (layer: Layer, point: { x: number; y: number }) => {
  const element = elementOf(layer.image)
  const angle = (-layer.rotation * Math.PI) / 180
  const dx = point.x - layer.x
  const dy = point.y - layer.y
  const localX = (dx * Math.cos(angle) - dy * Math.sin(angle)) / layer.scale
  const localY = (dx * Math.sin(angle) + dy * Math.cos(angle)) / layer.scale
  return (
    Math.abs(localX) <= element.naturalWidth / 2 && Math.abs(localY) <= element.naturalHeight / 2
  )
}

let drag: { dx: number; dy: number } | null = null

const onPointerDown = (event: PointerEvent) => {
  const point = toCanvas(event)
  const index = collage.value.layers.findLastIndex((layer) => hits(layer, point))
  selected.value = index === -1 ? null : index
  if (index === -1) {
    return
  }
  const layer = collage.value.layers[index]
  drag = { dx: point.x - layer.x, dy: point.y - layer.y }
  canvas.value!.setPointerCapture(event.pointerId)
}

const onPointerMove = (event: PointerEvent) => {
  const layer = selectedLayer.value
  if (!drag || !layer) {
    return
  }
  const point = toCanvas(event)
  layer.x = Math.round(point.x - drag.dx)
  layer.y = Math.round(point.y - drag.dy)
}

const onPointerUp = () => {
  drag = null
}

const onWheel = (event: WheelEvent) => {
  const layer = selectedLayer.value
  if (!layer) {
    return
  }
  event.preventDefault()
  // Chrome on Linux turns shift+wheel into a horizontal scroll, so the delta lands in deltaX.
  const delta = event.deltaY || event.deltaX
  if (event.shiftKey) {
    layer.rotation = (layer.rotation + Math.sign(delta) * 3) % 360
    return
  }
  layer.scale = Number((layer.scale * (delta < 0 ? 1.05 : 1 / 1.05)).toFixed(3))
}

const add = (image: string) => {
  const element = elementOf(image)
  const { width, height, layers } = collage.value
  const fit = element.naturalWidth
    ? Math.min(width / element.naturalWidth, height / element.naturalHeight) * 0.8
    : 0.5
  layers.push({
    image,
    x: width / 2,
    y: height / 2,
    scale: Number(fit.toFixed(3)),
    rotation: 0,
    opacity: 1,
    blend: 'source-over',
  })
  selected.value = layers.length - 1
}

const shift = (step: number) => {
  const layers = collage.value.layers
  const index = selected.value!
  const target = index + step
  if (target < 0 || target >= layers.length) {
    return
  }
  ;[layers[index], layers[target]] = [layers[target], layers[index]]
  selected.value = target
}

const remove = () => {
  collage.value.layers.splice(selected.value!, 1)
  selected.value = null
}

const open = async (target: string) => {
  const layout = layouts.value.find((candidate) => candidate.name === target.trim())
  name.value = target.trim()
  selected.value = null
  collage.value = layout ? await (await fetch(layout.url, { cache: 'no-store' })).json() : blank()
  status.value = layout ? `opened ${layout.name}` : 'new collage'
  localStorage.setItem(STORE_KEY, name.value)
}

const save = async () => {
  const target = name.value.trim()
  if (!target) {
    status.value = 'name the collage first'
    return
  }
  try {
    const res = await fetch(`/__save?name=${encodeURIComponent(`${target}.collage`)}&ext=json`, {
      method: 'POST',
      body: JSON.stringify(collage.value, null, 2),
    })
    if (!res.ok) {
      throw new Error((await res.text()) || `save failed (${res.status})`)
    }
    if (!layouts.value.some((layout) => layout.name === target)) {
      layouts.value.push({ name: target, url: `/data/${target}.collage.json` })
    }
    localStorage.setItem(STORE_KEY, target)
    status.value = `saved data/${target}.collage.json`
  } catch (error) {
    status.value = error instanceof Error ? error.message : String(error)
  }
}

const exportPng = () => {
  const target = document.createElement('canvas')
  render(target, false)
  target.toBlob((blob) => {
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob!)
    link.download = `${name.value.trim() || 'collage'}.png`
    link.click()
    setTimeout(() => URL.revokeObjectURL(link.href), 1000)
  })
}

onMounted(() => {
  images.forEach((image) => elementOf(image.name))
  const remembered = localStorage.getItem(STORE_KEY) ?? 'example'
  open(layouts.value.some((layout) => layout.name === remembered) ? remembered : 'example')
})
</script>

<template>
  <div class="flex h-full flex-col gap-3">
    <div class="flex flex-wrap items-center gap-2">
      <input
        v-model="name"
        name="collage-name"
        list="collage-names"
        class="input input-sm input-bordered w-56"
        placeholder="collage name, Enter to open"
        @keydown.enter="open(name)"
      />
      <datalist id="collage-names">
        <option v-for="layout in layouts" :key="layout.name" :value="layout.name" />
      </datalist>
      <select v-model="format" name="collage-format" class="select select-sm select-bordered w-24">
        <option
          v-for="option in formats"
          :key="option.label"
          :value="`${option.width}x${option.height}`"
        >
          {{ option.label }}
        </option>
      </select>
      <input
        v-model="collage.background"
        name="collage-background"
        type="color"
        class="h-8 w-10 cursor-pointer"
      />
      <button v-if="canSave" class="btn btn-sm btn-primary" @click="save">save</button>
      <button class="btn btn-sm" @click="exportPng">png</button>
      <span class="text-sm opacity-60">{{ status }}</span>
    </div>

    <div class="flex min-h-0 flex-1 gap-4">
      <div class="flex min-h-0 min-w-0 flex-1 items-start justify-center">
        <canvas
          ref="canvas"
          class="max-h-full max-w-full cursor-move touch-none shadow-lg"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @wheel="onWheel"
        ></canvas>
      </div>

      <div class="flex w-72 shrink-0 flex-col gap-4 overflow-y-auto">
        <div v-if="selectedLayer" class="flex flex-col gap-2">
          <div class="text-xs font-semibold uppercase opacity-50">{{ selectedLayer.image }}</div>
          <select
            v-model="selectedLayer.blend"
            name="layer-blend"
            class="select select-sm select-bordered"
          >
            <option v-for="blend in blends" :key="blend" :value="blend">{{ blend }}</option>
          </select>
          <label class="flex items-center gap-2 text-sm">
            <span class="w-16 opacity-60">opacity</span>
            <input
              v-model.number="selectedLayer.opacity"
              name="layer-opacity"
              type="range"
              min="0"
              max="1"
              step="0.01"
              class="range range-xs flex-1"
            />
          </label>
          <label class="flex items-center gap-2 text-sm">
            <span class="w-16 opacity-60">scale</span>
            <input
              v-model.number="selectedLayer.scale"
              name="layer-scale"
              type="range"
              min="0.05"
              max="4"
              step="0.005"
              class="range range-xs flex-1"
            />
          </label>
          <label class="flex items-center gap-2 text-sm">
            <span class="w-16 opacity-60">rotation</span>
            <input
              v-model.number="selectedLayer.rotation"
              name="layer-rotation"
              type="range"
              min="-180"
              max="180"
              step="1"
              class="range range-xs flex-1"
            />
          </label>
          <div class="flex gap-2">
            <button class="btn btn-xs" @click="shift(1)">up</button>
            <button class="btn btn-xs" @click="shift(-1)">down</button>
            <button class="btn btn-xs btn-error btn-outline" @click="remove">remove</button>
          </div>
        </div>

        <div class="flex flex-col gap-1">
          <div class="text-xs font-semibold uppercase opacity-50">
            layers ({{ collage.layers.length }})
          </div>
          <button
            v-for="index in [...collage.layers.keys()].reverse()"
            :key="index"
            class="btn btn-xs justify-start"
            :class="{ 'btn-primary': selected === index }"
            @click="selected = index"
          >
            {{ collage.layers[index].image }} · {{ collage.layers[index].blend }}
          </button>
        </div>

        <div class="flex flex-col gap-1">
          <div class="text-xs font-semibold uppercase opacity-50">images, click to add</div>
          <div class="grid grid-cols-3 gap-1">
            <img
              v-for="image in images"
              :key="image.name"
              :src="image.url"
              :title="image.name"
              class="aspect-square w-full cursor-pointer object-cover hover:opacity-80"
              @click="add(image.name)"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
