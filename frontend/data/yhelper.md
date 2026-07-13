Local DNS Setup

Domain: `*.deconstruct.dev` → `127.0.0.1`

```sh
# systemd-resolved: file created
/etc/systemd/resolved.conf.d/deconstruct.dev.conf

# Error during setup:
# Failed to enable unit: Unit file dnsmasq.service does not exist.
# make: *** [Makefile:36: dns-setup] Error 1
# → dnsmasq is not installed, need to: apt install dnsmasq
```
