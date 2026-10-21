#!/bin/sh
set -eu

owner="flow-browser-$$-$(date +%s)"
while ! mkdir /tmp/flow-browser.lock 2>/dev/null; do
  sleep 2
done
printf '%s\n' "$owner" > /tmp/flow-browser.lock/owner
trap 'if [ "$(cat /tmp/flow-browser.lock/owner 2>/dev/null)" = "$owner" ]; then rm -rf /tmp/flow-browser.lock; fi' EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

export OTEL_SDK_DISABLED=true
"$@"
