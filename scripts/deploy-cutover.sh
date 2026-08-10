#!/usr/bin/env bash
# Tier-1 "blue/green-lite" cutover — run ON THE DEPLOY BOX by .github/workflows/ci.yml, after the new
# code is on disk (git reset) and the new bundle is staged at frontend/dist.new. When this starts the
# live :80 process is STILL serving the OLD code (loaded in memory) + the OLD bundle.
#
# We pre-flight the new backend on a spare port (:3002). Only if it boots and serves do we swap the
# bundle + restart :80. A broken deploy never takes :80 down, and we roll the code back.
set -u
cd /root/x || exit 1

# The runtime is TypeScript, run via Node's native type stripping (no build step). Requires
# Node >= 22.6 on the box. The service configs (runtime/services/*.ts) spawn with these same flags.
NODE_TS="node --experimental-strip-types --disable-warning=ExperimentalWarning"

OLD_SHA="$(cat /tmp/x_prev_sha 2>/dev/null || git rev-parse HEAD)"
NEW_SHA="$(git rev-parse --short HEAD)"

rollback_code() {
  echo "rolling code back to $OLD_SHA"
  git reset --hard "$OLD_SHA" && npm install
}

# 1. Pre-flight the NEW backend on :3002 — :80 stays on the old code the whole time.
echo "pre-flighting $NEW_SHA on :3002 ..."
PORT=3002 BIND_HOST=127.0.0.1 NODE_ENV=production $NODE_TS runtime/api.ts > /tmp/x-preflight.log 2>&1 &
PRE=$!
ok=0
for _ in $(seq 1 12); do
  sleep 1
  if curl -fsS -m 5 http://127.0.0.1:3002/ > /dev/null 2>&1; then
    ok=1
    break
  fi
done
kill "$PRE" 2>/dev/null

if [ "$ok" != 1 ]; then
  echo "PRE-FLIGHT FAILED: $NEW_SHA did not boot on :3002 — prod :80 untouched"
  tail -n 25 /tmp/x-preflight.log
  rollback_code
  rm -rf frontend/dist.new
  exit 1
fi

# 3. Green: swap the bundle in + restart :80 (new backend + new bundle together), then verify.
echo "pre-flight green — cutting :80 over to $NEW_SHA"
rm -rf frontend/dist && mv frontend/dist.new frontend/dist
# Free :80 first: after a droplet reboot the live api can be a stray *manual* process (started
# outside serviceManager, e.g. via setsid) that `service restart` won't stop — the new instance
# would then EADDRINUSE. Kill whatever holds the api so the managed service binds cleanly.
pkill -f 'runtime/api.ts' 2>/dev/null || true
sleep 1
$NODE_TS runtime/cli.ts service restart api
sleep 3
if ! curl -fsS -m 10 http://127.0.0.1/ > /dev/null 2>&1; then
  echo "CUTOVER CHECK FAILED — rolling back to $OLD_SHA"
  rollback_code
  $NODE_TS runtime/cli.ts service restart api
  exit 1
fi

echo "deployed $NEW_SHA  (previous $OLD_SHA — rollback: git reset --hard $OLD_SHA && npm install && $NODE_TS runtime/cli.ts service restart api)"
