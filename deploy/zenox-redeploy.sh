#!/usr/bin/env bash
#
# Privileged half of the admin panel Redeploy button.
#
# Installed to /usr/local/sbin/zenox-redeploy, owned by root, mode 0755:
#
#   sudo install -o root -g root -m 0755 \
#     /opt/zenox/deploy/zenox-redeploy.sh /usr/local/sbin/zenox-redeploy
#
# INSTALL IT THERE, NOT FROM THE APP TREE. /opt/zenox is owned by the zenox
# user, so a script executed as root from inside it would hand anything that
# could write a file as zenox — the web process included — a way to run
# arbitrary code as root. The whole point of the marker-file handshake is that
# the unprivileged side never supplies anything the privileged side executes.
# For the same reason this script is self-contained rather than calling
# deploy.sh, which also lives in the writable tree.
#
# The copy in the repository is the source of truth for review, but updating it
# changes nothing on the server until someone re-runs the install command above.
# That is deliberate: a commit should not be able to silently rewrite the code
# this machine runs as root.
#
# Takes no arguments. A deployment always means the same thing.

set -uo pipefail

APP_DIR=/opt/zenox
APP_USER=zenox
BRANCH=main

DATA_DIR="$APP_DIR/data"
REQUEST_FILE="$DATA_DIR/deploy.request"
STATE_FILE="$DATA_DIR/deploy-state.json"
LOG_FILE="$DATA_DIR/deploy.log"
LOCK_FILE="$DATA_DIR/deploy.lock"

if [ "$(id -u)" -ne 0 ]; then
	echo "error: zenox-redeploy must run as root." >&2
	exit 1
fi

mkdir -p "$DATA_DIR"

# Clear the marker before anything else so systemd re-arms the path unit. Leave
# it in place and the next request, arriving while this run is still going,
# would never fire.
rm -f "$REQUEST_FILE"

# Second lock behind systemd's own serialisation of the oneshot unit. If a run
# is already in flight this one steps aside; the running deploy will publish a
# result either way.
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
	echo "zenox-redeploy: a deployment is already running, nothing to do." >&2
	exit 0
fi

RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)-$$"
STARTED_AT="$(date +%s%3N)"

as_app() { sudo -u "$APP_USER" "$@"; }
git_app() { as_app git -C "$APP_DIR" "$@"; }

# Hashes only, and only ever from git itself, so nothing free-form reaches the
# JSON the panel parses.
read_commit() {
	local hash
	hash="$(git_app rev-parse HEAD 2>/dev/null)" || return 1
	[[ "$hash" =~ ^[0-9a-f]{40}$ ]] || return 1
	printf '%s' "$hash"
}

PREVIOUS_COMMIT="$(read_commit || true)"

# Written atomically: the panel polls this file roughly every two seconds and
# must never read a half-written object.
write_state() {
	local status="$1" finished="${2:-null}" exit_code="${3:-null}" commit="${4:-}"
	local tmp="$STATE_FILE.tmp"
	{
		printf '{\n'
		printf '  "status": "%s",\n' "$status"
		printf '  "runId": "%s",\n' "$RUN_ID"
		printf '  "startedAt": %s,\n' "$STARTED_AT"
		printf '  "finishedAt": %s,\n' "$finished"
		printf '  "exitCode": %s,\n' "$exit_code"
		printf '  "commit": %s,\n' "$([ -n "$commit" ] && printf '"%s"' "$commit" || printf 'null')"
		printf '  "previousCommit": %s\n' "$([ -n "$PREVIOUS_COMMIT" ] && printf '"%s"' "$PREVIOUS_COMMIT" || printf 'null')"
		printf '}\n'
	} >"$tmp"
	chmod 0644 "$tmp"
	mv -f "$tmp" "$STATE_FILE"
}

write_state deploying

# Everything from here is the deployment transcript the panel displays.
exec >"$LOG_FILE" 2>&1
chmod 0644 "$LOG_FILE"

echo "==> Redeploy $RUN_ID"
echo "==> Requested through the admin panel at $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
[ -n "$PREVIOUS_COMMIT" ] && echo "==> Currently on ${PREVIOUS_COMMIT:0:7}"
echo

# A subshell with errexit: the first failing step ends the run, and the exit
# status survives for the state file. errexit in a plain function would take the
# whole script down with it and never write the result.
(
	set -e

	cd "$APP_DIR"

	if [ ! -f .env ]; then
		echo "error: $APP_DIR/.env is missing. The app will not start without it." >&2
		exit 1
	fi

	echo "==> Fetching origin/$BRANCH"
	git_app fetch --prune origin

	if ! git_app diff --quiet || ! git_app diff --cached --quiet; then
		echo "warning: discarding uncommitted changes in $APP_DIR"
	fi
	git_app reset --hard "origin/$BRANCH"

	echo
	echo "==> Installing dependencies"
	as_app npm ci --no-audit --no-fund

	echo
	echo "==> Building"
	# NEXT_PUBLIC_* values are compiled into the browser bundle here, read from
	# .env by the framework dotenv loader. The build runs before the restart, so
	# a compile failure leaves the version currently serving traffic untouched.
	as_app npm run build

	echo
	echo "==> Restarting zenox"
	systemctl restart zenox

	sleep 3
	if ! systemctl is-active --quiet zenox; then
		echo "error: zenox failed to start. Last 30 log lines:" >&2
		journalctl -u zenox -n 30 --no-pager >&2
		exit 1
	fi
)
RC=$?

FINISHED_AT="$(date +%s%3N)"
NEW_COMMIT="$(read_commit || true)"

echo
if [ "$RC" -eq 0 ]; then
	echo "==> Deployment succeeded on ${NEW_COMMIT:0:7}"
	write_state success "$FINISHED_AT" "$RC" "$NEW_COMMIT"
else
	echo "==> Deployment FAILED with exit code $RC"
	write_state failed "$FINISHED_AT" "$RC" "$NEW_COMMIT"
fi

exit "$RC"
