# CENTCOM · Threat COP Military UX

Authenticated threat COP for geopolitical, infrastructure, public-health, weather, cybersecurity, transportation, energy, and economic events.

**Not** an emergency alerting system, clinical decision-support tool, or authoritative government intelligence source.

Inspired by the interaction model of [WorldMonitor](https://github.com/koala73/worldmonitor) only — no AGPL source, branding, or assets are reused.

## Stack

- Next.js App Router + TypeScript
- Convex (schema, queries, mutations, crons, realtime)
- Clerk authentication
- Tailwind CSS (dark operational theme)
- Vercel-ready (`next build`)

## Quick start

```bash
npm install
cp .env.local.example .env.local
# Fill Clerk keys; claim app on first run if using Clerk keyless
npm run dev
```

Then:

1. Open the app and complete Clerk setup if prompted.
2. Create a Clerk JWT template named **`convex`** and set `CLERK_JWT_ISSUER_DOMAIN` on the Convex deployment.
3. Sign in — the first load seeds **clearly labeled demo data** via the synthetic provider.

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Convex + Next dev |
| `npm run build` | Production Next build |
| `npm run test` | Unit tests (Vitest) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |

## Routes

| Route | Access |
|-------|--------|
| `/` | Public landing or authenticated dashboard |
| `/event/[eventId]` | Authenticated event detail |
| `/bookmarks` | Current user bookmarks |
| `/settings` | Private filter preferences |

## X OSINT account feeds

Track specific X handles (e.g. `@OSINTtechnical`) and build tailored channels:

1. Create an X developer app and copy the **Bearer Token**
2. On the Convex deployment:  
   `npx convex env set X_BEARER_TOKEN "YOUR_BEARER_TOKEN"`
3. In the dashboard **X OSINT** tab: seed defaults or add `@handles` + channel (e.g. `ukraine`, `iran`, `global`)
4. Keep the dashboard open while signed in: X pulls **once shortly after open**, then every **30 minutes** while the tab is active.  
   - **No X polling when the app is closed** (not a server cron).  
   - **Pull now** still forces an immediate refresh (rate-limited).

Posts are ranked by a simple **signal score** (military/conflict keywords + theater names) and filterable by channel / account. This uses the official X API — not scraping.

## Security notes

- Private Convex functions require Clerk identity; preferences/bookmarks are owner-scoped.
- Ingestion mutations are internal or rate-limited; secrets never use `NEXT_PUBLIC_*`.
- Summaries render as text; source links must be `https:`.
- CSP and security headers are set in `next.config.ts`.
- `X_BEARER_TOKEN` is server-side only (Convex env).

## Release gates

1. PRD approved  
2. Tickets approved  
3. Implementation complete  
4. Automated tests passing  
5. Security review complete  
6. Preview deployment verified  
7. Production deployment **explicitly approved**  
8. Production deployment verified  

Do not treat a green Vercel build as verified production behavior.

## License / product boundary

Prototype for MSWlab.ai. Demo data must remain labeled. Generated summaries are never verified facts.
