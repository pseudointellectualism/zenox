# Deploying Zenox on your own VPS

Target: Ubuntu 24.04, Node 24, Caddy for HTTPS, systemd to keep the app alive.
The app listens on `127.0.0.1:3000` and is reachable only through Caddy.

Run every command as root unless a step says otherwise.

## 1. Install the runtime

```bash
apt update && apt install -y curl git ca-certificates
curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
apt install -y nodejs
node -v   # expect v24.x
```

Caddy, from its official repository:

```bash
apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update && apt install -y caddy
```

## 2. Create the service account

The app runs as an unprivileged user that cannot log in.

```bash
adduser --system --group --home /opt/zenox --shell /usr/sbin/nologin zenox
```

## 3. Give the server read access to the private repo

Skip this step if your copy of the repository is public; the clone in step 4
works over HTTPS without a key. If it is private, the VPS needs its own
read-only key. Generate one that belongs to the machine, not to you:

```bash
sudo -u zenox ssh-keygen -t ed25519 -f /opt/zenox/.ssh/id_deploy -N "" -C "zenox-vps-deploy"
cat /opt/zenox/.ssh/id_deploy.pub
```

Add that public key at **Settings → Deploy keys → Add deploy key** on the
repository. Leave "Allow write access" unchecked: the server only ever reads.

Then tell git to use it:

```bash
sudo -u zenox tee /opt/zenox/.ssh/config >/dev/null <<'EOF'
Host github.com
  IdentityFile /opt/zenox/.ssh/id_deploy
  IdentitiesOnly yes
EOF
sudo -u zenox chmod 600 /opt/zenox/.ssh/config
```

## 4. Clone the code

```bash
sudo -u zenox git clone https://github.com/pseudointellectualism/zenox.git /opt/zenox/app
```

If your copy is private and you set up a deploy key in step 3, clone over SSH
instead, with `git@github.com:pseudointellectualism/zenox.git`.

Move it into place so paths match the service file:

```bash
shopt -s dotglob && mv /opt/zenox/app/* /opt/zenox/ && rmdir /opt/zenox/app
chown -R zenox:zenox /opt/zenox
```

## 5. Write the configuration

```bash
sudo -u zenox cp /opt/zenox/.env.example /opt/zenox/.env
sudo -u zenox chmod 600 /opt/zenox/.env
```

Generate each secret **on the server** so it never travels through a chat log
or an email. Run this three times and paste one value into each of
`STREAM_TOKEN_SECRET`, `ADMIN_SESSION_SECRET`, and `ADMIN_GATE_KEY`:

```bash
openssl rand -hex 32
```

Then edit `/opt/zenox/.env` and fill in the rest. The file documents every
variable. At minimum, set these before the first build:

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | `https://example.com` |
| `NEXT_PUBLIC_SITE_DOMAIN` | `example.com` |
| `TMDB_API_KEY` | your own key from themoviedb.org |
| `ADMIN_USER_1` / `ADMIN_PASS_1` | your owner login |
| `STREAM_TOKEN_SECRET` | generated above |
| `ADMIN_SESSION_SECRET` | generated above |
| `ADMIN_GATE_KEY` | generated above |

Anything left blank disables that feature rather than falling back to a
default. There are no built-in credentials.

## 6. Build

```bash
cd /opt/zenox
sudo -u zenox npm ci --no-audit --no-fund
sudo -u zenox npm run build
```

`NEXT_PUBLIC_*` values are compiled into the browser bundle during this step,
so changing one later means building again, not just restarting.

## 7. Start the service

```bash
mkdir -p /opt/zenox/data && chown zenox:zenox /opt/zenox/data
cp /opt/zenox/deploy/zenox.service /etc/systemd/system/zenox.service
systemctl daemon-reload
systemctl enable --now zenox
systemctl status zenox --no-pager
```

Confirm it answers locally before involving DNS:

```bash
curl -si http://127.0.0.1:3000/api/servers | head -5
```

## 8. Open the firewall

```bash
ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 443/tcp && ufw --force enable
```

## 9. Point DNS at this server

At whichever registrar holds `example.com`, point both hostnames at this server.
The second one is the admin panel, and its name has to match `ADMIN_DOMAIN`:

| Host | Type | Value |
| --- | --- | --- |
| `@` | A | your server IP |
| `admin` | A | your server IP |

If you are moving from an existing host, leave the old one running until the new
one serves traffic. DNS changes take up to an hour to propagate, and the old host
answering in the meantime is better than nothing answering.

## 10. Start Caddy

Only after `example.com` resolves to this server, or certificate issuance fails:

```bash
cp /opt/zenox/Caddyfile /etc/caddy/Caddyfile
systemctl reload caddy
journalctl -u caddy -n 30 --no-pager
```

Edit the `email` line in the Caddyfile first so expiry warnings reach you.

## Day-to-day

| Task | Command |
| --- | --- |
| Deploy the latest commit | `sudo /opt/zenox/deploy/deploy.sh` |
| Follow application logs | `journalctl -u zenox -f` |
| Restart | `systemctl restart zenox` |
| Check HTTPS | `journalctl -u caddy -n 50 --no-pager` |

## 11. Enable the Redeploy button (optional)

The admin panel has a Deploy tab that can pull, rebuild, and restart without an
SSH session. It does nothing until the hook below is installed, and the panel
says so plainly rather than appearing to work.

The application cannot deploy itself. It runs as `zenox` under a unit with
`NoNewPrivileges=yes`, so `sudo` and `systemctl` are closed to it. Instead the
panel creates an empty file in `/opt/zenox/data`, the one directory it can
write, and systemd runs a fixed script when that file appears. The request
carries no arguments, so pressing the button can only ever mean one thing.

```bash
sudo install -o root -g root -m 0755 \
  /opt/zenox/deploy/zenox-redeploy.sh /usr/local/sbin/zenox-redeploy
sudo cp /opt/zenox/deploy/zenox-redeploy.service /etc/systemd/system/
sudo cp /opt/zenox/deploy/zenox-redeploy.path /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now zenox-redeploy.path
```

Install the script to `/usr/local/sbin`, not from `/opt/zenox`. The app tree is
owned by `zenox`, so a root script living inside it could be rewritten by the
web process and would hand that process root. The copy under `deploy/` is there
to be reviewed and version controlled; the server only picks up changes when you
re-run the `install` line above. That is deliberate, so no commit can quietly
change what this machine runs as root.

Check it:

```bash
systemctl status zenox-redeploy.path --no-pager
sudo systemctl start zenox-redeploy.service   # runs one deploy now
journalctl -u zenox-redeploy -n 40 --no-pager
```

| Task | Command |
| --- | --- |
| Watch a panel-triggered deploy | `journalctl -u zenox-redeploy -f` |
| Read the last transcript | `cat /opt/zenox/data/deploy.log` |
| Read the last result | `cat /opt/zenox/data/deploy-state.json` |
| Turn the button off | `sudo systemctl disable --now zenox-redeploy.path` |

Disabling the path unit is the kill switch. The panel keeps rendering, reports
that nothing picked the request up, and no deployment can be started from the
web.

## Playback sources

The provider registry ships empty and no endpoints are compiled in. The app
reads whatever you configure at runtime:

- `STREAM_PROVIDERS` — a JSON array of your own endpoints. Origins listed here
  are added to the Content-Security-Policy allowlist automatically.
- `SCRAPER_VPS_URL` and `SCRAPER_API_SECRET` — a resolver service you run.
  `/api/v1/stream/[token]` posts the verified token payload to
  `${SCRAPER_VPS_URL}/stream` and returns the HLS manifest it replies with.
- `STREAM_EXTRA_ORIGINS` — extra hosts serving media, comma separated, when
  segments come from somewhere other than the endpoints above.
