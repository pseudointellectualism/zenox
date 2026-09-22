# Zenox - The Orginal

# A open source PLAYER and UI !

A streaming front end built on Next.js. It browses a film and television catalogue
from TMDB, plays back through endpoints you configure yourself, and syncs watch
history to Trakt, Simkl, MyAnimeList and AniList.

## Stack

- Next.js 15 (App Router, Server Components) and React 19, TypeScript strict
- Tailwind CSS v4, configured CSS-first in `app/globals.css` — there is no `tailwind.config.ts`
- A custom player built on Vidstack and hls.js
- Supabase for accounts, sync and notifications; Zustand with `localStorage` for client state

## Running it locally

```bash
npm install
npm run dev
```

It starts on `http://localhost:3000`. Every TMDB call falls back to the fixture
catalogue in `lib/mock-data.ts`, so the app builds and runs with no API key and
no configuration at all — useful for working on the interface.

## Configuration

Copy `.env.example` to `.env.local` and fill in what you need. The file documents
every variable. Nothing is required to start, and anything left blank disables
that feature rather than falling back to a default.

The values worth knowing about:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Your origin. The OAuth redirect URI and the playback referer allowlist are both derived from it. |
| `TMDB_API_KEY` | Real catalogue data instead of the fixtures. |
| `STREAM_PROVIDERS` | Your playback endpoints, as JSON. See below. |
| `STREAM_TOKEN_SECRET` | Signs the short-lived playback tokens. Generate with `openssl rand -hex 32`. |
| `ADMIN_USER_1` / `ADMIN_PASS_1` | The owner login. Generate the password digest with `node scripts/hash-password.mjs`. |

`NEXT_PUBLIC_*` values are compiled into the browser bundle by `next build`, so
changing one means rebuilding, not just restarting.

## Playback sources

The provider registry in `lib/providers.ts` ships empty. Endpoints come from your
own `STREAM_PROVIDERS` variable at runtime, and the origins you list there are fed
into the Content-Security-Policy allowlist in `middleware.ts` automatically. With
nothing configured the player renders its configuration empty state.

One exception to be aware of before you deploy this: `lib/sources/stellar.ts`
resolves the first server slot through a third-party service whose address is
written into the file. Point it somewhere of your own or remove it.

## The admin panel

The owner panel lives at `/admin` and is served only on the hostname you set as
`ADMIN_DOMAIN`. Every other host returns 404 for that path. Access is a password
login checked against an scrypt digest with a per-IP lockout; there are no built-in
credentials, so with nothing configured every login attempt fails.

## Deploying

`DEPLOY.md` walks through a single Ubuntu server from nothing to HTTPS, using
Caddy and systemd, including an optional hook that lets the admin panel redeploy
the app without an SSH session.

## Attribution

This product uses the TMDB API but is not endorsed or certified by TMDB.
