```bash
rsync -azP --rsync-path="sudo -u netplov -H rsync" index.php chat:/home/netplov
rsync -azP --rsync-path="sudo -n -u netplov -H rsync" "$FilePath$" chat:/home/netplov/"$FileName$"
rsync -azP --rsync-path="sudo -u rel-uassist -H rsync" app/customer/controller/Customer.php rel:/home/rel-uassist/htdocs/chat/app/customer/controller/Customer.php
```
