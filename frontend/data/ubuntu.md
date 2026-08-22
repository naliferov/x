**shortcuts** лежат в `~/.local/share/applications`

Exec=/usr/bin/cursor --class=Cursor Icon=/home/deconstruct/Downloads/img/cursor.png StartupWMClass=Cursor

## rsync

```bash
rsync -azP --rsync-path="sudo -u netplov -H rsync" index.php chat:/home/netplov
rsync -azP --rsync-path="sudo -n -u netplov -H rsync" "$FilePath$" chat:/home/netplov/"$FileName$"
rsync -azP --rsync-path="sudo -u rel-uassist -H rsync" app/customer/controller/Customer.php rel:/home/rel-uassist/htdocs/chat/app/customer/controller/Customer.php
```

## хосты

```sh
scp -r s.js user@64.227.125.21:/home/user
scp root@209.38.206.72:x/index.html ./   # x droplet
ssh x8core@192.168.0.120                 # raspberry pi
```
