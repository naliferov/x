Composition API

-   `setup()` , `ref` , `reactive` , `computed` , `watch`
-   Logic is grouped by functionality rather than by `data/methods` sections
-   Convenient reuse through composables
-   Maximally TypeScript-friendly

New reactivity system (Proxy)

-   Based on `Proxy` rather than `Object.defineProperty`
-   ❌ `Vue.set` / `this.$set` is no longer needed
-   Any new properties become reactive automatically

Improved TypeScript support

-   Full typing of components
-   `defineComponent` , `defineProps` , `defineEmits`
-   Predictable types for props, emits, slots

**fragments** Multiple root elements in a template without a wrapper `<template> <span>A</span> <span>B</span> </template>`

### 5\. Teleport

Render a component outside the current DOM tree

```html
<teleport to="body">
	<Modal />
</teleport>
```

Good for:

-   modals
-   tooltips
-   dropdowns

## 6\. Suspense

Async components with a fallback UI `<Suspense> <template #default> <AsyncComponent /> </template> <template #fallback> Loading... </template> </Suspense>`

## 7\. New v-model

-   Support for multiple `v-model` bindings
-   Custom names `<MyInput v-model:title="title" />`

Pairing:

-   `modelValue`
-   `update:modelValue`

## Hooks

`onMounted() onUpdated() onUnmounted() onActivated() onDeactivated()`

## 10\. `<script setup>`

New SFC syntax: `<script setup> import { ref } from 'vue' const count = ref(0) </script>`

-   Less boilerplate code
-   Auto-export
-   Faster compilation
