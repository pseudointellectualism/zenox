# Project Memory: Zenox — Cinematic Streaming Platform

## Stack
- Next.js 15 (App Router, Server Components, TypeScript strict)
- Tailwind CSS v4 (CSS-first `@theme` in `app/globals.css` — there is no `tailwind.config.ts`)
- Vidstack Player (`@vidstack/react@1.15.x`, pinned — the `latest` dist-tag is stale at 0.6.15 and peers on React 18)
- TMDB REST API with ISR revalidation; Zustand + localStorage for client state

## Design tokens ("Cinematic Glassmorphism")
Never hardcode a hex value in a component. Every color comes from a `@theme` token in `app/globals.css`.

- Canvas `#04120b` · Dim `#050505` · Bright `#1d1728`
- Containers: lowest `#0a0a0a` · low `#131829` · base `#1c243c` · high `#251e32` · highest `#302741`
- Primary `#95ff50` (lime) — STRICTLY reserved for play actions, active tabs, and primary CTAs. Never decorative.
- On-primary `#000000` · Primary hover `#c9ffab` · Secondary `#7a6bae` · Muted text `#756790`
- Glass surface: `rgba(29,23,40,0.6)` + `blur(20px)` + `1px solid rgba(255,255,255,0.1)`
- Modal surface: `rgba(10,10,10,0.9)` + `blur(40px)` + `1px solid rgba(255,255,255,0.15)`
- Type: Montserrat (display/headings) · Inter (body/labels). Use the `.text-display`, `.text-headline-*`,
  `.text-title-lg`, `.text-body-*`, `.text-label-*` utilities — do not respell sizes inline.
- 8px grid. Cards `rounded-xl` (12px). Buttons `rounded-full`. Page width capped at `max-w-page` (1280px).

## Architectural constraints
- TMDB requests run ONLY in Server Components or Route Handlers. `TMDB_API_KEY` must never reach the client bundle.
- Every `lib/tmdb.ts` function falls back to `lib/mock-data.ts` so the app builds and runs with no API key.
- Components stay under ~200 lines. Split before exceeding.
- Explicit TypeScript interfaces for every TMDB payload and player source. No `any`.

## Streaming providers — read before touching `lib/providers.ts`
The registry ships EMPTY. There are no built-in playback sources of any kind, and none are ever to be added
to the codebase — not third-party embeds (vidsrc, embed.su and similar), not demo streams. Every endpoint comes
from the operator's own `STREAM_PROVIDERS` env var at runtime, and `providerOrigins()` feeds those origins into
the CSP allowlist in `middleware.ts`. With nothing configured the player renders its configuration empty state.

## Quality gates
- Run `npm run typecheck` and `npm run build` after every multi-file change.
- Never use heavy opaque box-shadows. Depth comes from frosted borders and ambient glow only.
- Any iframe provider must render inside the sandboxed frame in `PlayerContainer` — `allow-top-navigation` is
  never permitted, and its origin must be added to `frame-src` in `middleware.ts`.
