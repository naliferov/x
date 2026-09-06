# dev

**supabase** - db pull / migrate - session pooler (5432); runtime → transaction pooler (6543).

[context7](https://context7.com) - `npx @upstash/context7-mcp`. Бесплатно без ключа, ключ только поднимает лимиты.

**архитектура** - контроллер санирует, модель валидирует; между моделью и представлением всегда посредник. Слои нарезать, но без астронавтики.

**distributive conditional type** - `U` голым слева от `extends` раздаётся по членам союза:

```ts
type Distribute<U> = U extends unknown ? (arg: U) => void : never;
type Result = Distribute<{ 'crm': 'crm' } | { 'crm.contacts': 'crm/contacts' }>;
// = ((arg: { 'crm': 'crm' }) => void) | ((arg: { 'crm.contacts': 'crm/contacts' }) => void)
```

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
