#!/usr/bin/env bash
#
# Pull the latest main, rebuild, and restart:
#
#   sudo /opt/zenox/deploy/deploy.sh
#
# Runs as root because it restarts the service, but every step that touches
# the code drops to the unprivileged app user, so nothing in /opt/zenox ends
# up root-owned and unwritable by the service.
#
# The build runs before the restart, so a compile failure leaves the version
# that is currently serving traffic untouched.

set -euo pipefail

APP_DIR=${APP_DIR:-/opt/zenox}
APP_USER=${APP_USER:-zenox}

if [ "$(id -u)" -ne 0 ]; then
	echo "error: run this as root (sudo $0)." >&2
	exit 1
fi

run_as() { sudo -u "$APP_USER" "$@"; }

cd "$APP_DIR"

if [ ! -f .env ]; then
	echo "error: $APP_DIR/.env is missing. The app will not start without it." >&2
	exit 1
fi

echo "==> Fetching origin/main"
run_as git fetch --prune origin

# The deploy box is not a place to edit code: local changes are discarded so
# the running version always matches a commit you can point at.
if ! run_as git diff --quiet || ! run_as git diff --cached --quiet; then
	echo "warning: discarding uncommitted changes in $APP_DIR"
fi
run_as git reset --hard origin/main

echo "==> Installing dependencies"
run_as npm ci --no-audit --no-fund

echo "==> Building"
# NEXT_PUBLIC_* values are compiled into the browser bundle here, read from
# .env by Next's own dotenv loader. Changing one requires this rebuild.
run_as npm run build

echo "==> Restarting service"
systemctl restart zenox

sleep 3
if systemctl is-active --quiet zenox; then
	echo "==> zenox is running ($(run_as git rev-parse --short HEAD))"
else
	echo "error: zenox failed to start. Last 30 log lines:" >&2
	journalctl -u zenox -n 30 --no-pager >&2
	exit 1
fi
