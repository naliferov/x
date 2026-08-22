# dev

## Мелочи, которые каждый раз забываются

```css
/* flex - перенести на следующую строку */
flex: 1 0 100%;
```

**supabase** - db pull / migrate → session pooler (5432); runtime → transaction pooler (6543).

[context7](https://context7.com) - `npx @upstash/context7-mcp`. Бесплатно без ключа, ключ только поднимает лимиты.

**реактивность, посмотреть своими глазами** - в песочнице вписать в шаблон `{{ (() => { console.log('test') })() }}` и несколько раз дёрнуть реактивную переменную: видно, сколько раз реально произошёл пересчёт. [разбор от автора Solid](https://www.youtube.com/live/R5AcOtxIdMk?feature=shared)
