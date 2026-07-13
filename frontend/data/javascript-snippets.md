//canvas render

const calcRenderParams = () => {

```javascript
  const container = preview.value
  if (!container) return null

  const dpr = window.devicePixelRatio || 1
  const width = container.offsetWidth
  const height = container.offsetHeight

  return { width, height, dpr }
}

const resizeCanvas = () => {
  const el = canvas.value
  const params = calcRenderParams()
  if (!el || !params) return null

  const { width, height, dpr } = params
  el.width = Math.round(width * dpr)
  el.height = Math.round(height * dpr)
  el.style.width = width + 'px'
  el.style.height = height + 'px'

  return params
}

const renderSceneOnCanvas = (params) => {
  const el = canvas.value
  if (!el) return
  const ctx = el.getContext('2d')
  if (!ctx) return
  renderScene(ctx, params, props.visual)
}
```

**JS Pipe via Symbol.toPrimitive**

```js
Function.prototype[Symbol.toPrimitive] = function() {
    const symbol = Symbol();
    const f = this;
    Object.prototype[symbol] = function() { return f(this); }
    return symbol;
}
console.log(10[x => x + 2]()[x => x + 500]()); // 512
```

PWA install — Service Worker

```js
self.addEventListener('install', (e) => {
    e.waitUntil((async () => {
        const cache = await caches.open(cacheName);
        // await cache.addAll([...]);
    })());
});

self.addEventListener('fetch', (e) => {
    e.respondWith((async () => {
        const r = await caches.match(e.request);
        // if (r) return r;
    })());
});
```

//media recorder  
(() => {

```js
  const chunks = []
  const video = document.querySelector('video')
  const stream = video.captureStream()
  const mimeType = 'video/webm'
  const recorder = new MediaRecorder(stream, { mimeType })

  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data)
  recorder.onstop = () => {
    const blob = new Blob(chunks, { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'recording.webm'
    a.click()
    URL.revokeObjectURL(url)
  }
  recorder.start()
  setTimeout(() => recorder.stop(), 8000)
})();
```
