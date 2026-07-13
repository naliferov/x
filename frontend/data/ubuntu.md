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
