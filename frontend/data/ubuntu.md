**shortcuts** are stored in the ~/.local/share/applications folder

### example shortcut

\[Desktop Entry\] Type=Application Name=Cursor Exec=/usr/bin/cursor --class=Cursor Icon=/home/deconstruct/Downloads/img/cursor.png Terminal=false Categories=Development; StartupWMClass=Cursor

**Terminal:** the paste hotkey can be set to ctrl + v

## systemd — service template

```ini
# /etc/systemd/system/myapp.service
[Unit]
Description=My App

[Service]
Type=notify
ExecStart=/usr/bin/node /home/user/app/index.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

```sh
sudo systemctl daemon-reload
sudo systemctl start myapp.service
sudo systemctl enable myapp.service  # autostart after reboot
```

## Running a process in the background (shell)

```sh
./node s.js &> s.log & disown
```

## rsync

```bash
rsync -azP --rsync-path="sudo -u netplov -H rsync" index.php chat:/home/netplov
rsync -azP --rsync-path="sudo -n -u netplov -H rsync" "$FilePath$" chat:/home/netplov/"$FileName$"
rsync -azP --rsync-path="sudo -u rel-uassist -H rsync" app/customer/controller/Customer.php rel:/home/rel-uassist/htdocs/chat/app/customer/controller/Customer.php
```

## scp — copying files

```sh
# To the server
scp -r s.js user@64.227.125.21:/home/user

# From the server
scp -r user@ssh.example.com:/path/to/remote /path/to/local

# ocraft droplet
scp root@209.38.206.72:ocraft/index.html ./
```

## raspberry pi

```sh
ssh x8core@192.168.0.120
```
