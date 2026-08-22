# dev

## Мелочи, которые каждый раз забываются

```css
/* flex - перенести на следующую строку */
flex: 1 0 100%;
```

**supabase** - db pull / migrate → session pooler (5432); runtime → transaction pooler (6543).

[context7](https://context7.com) - `npx @upstash/context7-mcp`. Бесплатно без ключа, ключ только поднимает лимиты.

**реактивность, посмотреть своими глазами** - в песочнице вписать в шаблон `{{ (() => { console.log('test') })() }}` и несколько раз дёрнуть реактивную переменную: видно, сколько раз реально произошёл пересчёт. [разбор от автора Solid](https://www.youtube.com/live/R5AcOtxIdMk?feature=shared)

## работа

**вопросы им:**

-   Can I see the potential workplace and how everything is set up there? In particular, the air conditioning and zoning system?

**рост:**

own 1-2 perimeters (background jobs/worker · backend-module architecture · observability/reliability · db correctness/migrations). Hold one perimeter, not everything.

## машины и хосты

**shortcuts** лежат в `~/.local/share/applications`

Exec=/usr/bin/cursor --class=Cursor Icon=/home/deconstruct/Downloads/img/cursor.png StartupWMClass=Cursor

### rsync

```bash
rsync -azP --rsync-path="sudo -u netplov -H rsync" index.php chat:/home/netplov
rsync -azP --rsync-path="sudo -n -u netplov -H rsync" "$FilePath$" chat:/home/netplov/"$FileName$"
rsync -azP --rsync-path="sudo -u rel-uassist -H rsync" app/customer/controller/Customer.php rel:/home/rel-uassist/htdocs/chat/app/customer/controller/Customer.php
```

### хосты

```sh
scp -r s.js user@64.227.125.21:/home/user
scp root@209.38.206.72:x/index.html ./   # x droplet
ssh x8core@192.168.0.120                 # raspberry pi
```
