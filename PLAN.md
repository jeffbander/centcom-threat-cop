# Global Situation Monitor — Implementation Plan (v1)

**Status:** APPROVED — implementation in progress / v1 scaffold complete  
**Product:** Global Situation Monitor (MSWlab.ai prototype)  
**Stack:** Next.js App Router + TypeScript · Convex · Clerk · Tailwind · Vercel  
**Inspiration only:** [WorldMonitor](https://github.com/koala73/worldmonitor) (AGPL-3.0) — **no code, branding, copy, or assets reused**  
**Workspace:** `/Users/jeffrey.bander/world` (greenfield)

Do not begin implementation until this plan is explicitly approved.

---

## 1. Proposed tickets

Six dependency-ordered tickets. Exactly one foundation owns schema, auth, deps, theme tokens, app shell, and primary routes. Downstream tickets **use** those surfaces; they do not re-invent schema or `package.json`.

| Key | Title | Type | Layer | Foundation |
|-----|--------|------|-------|------------|
| `foundation` | App foundation, Clerk auth, Convex identity, full schema, dark ops theme | feature | 0 | **yes** |
| `ingestion` | Synthetic provider, seed, idempotent ingestion, priority scoring | feature | 1 | no |
| `dashboard-shell` | Dashboard layout, filters, overview metrics, responsive shell | feature | 2 | no |
| `map` | Interactive map, clustered markers, accessible list fallback | feature | 3 | no |
| `feed-details` | Intelligence feed, event detail, bookmarks, preferences | feature | 3 | no |
| `hardening` | Security, a11y, tests, observability, Vercel verification gates | chore | 4 | no |

---

### T1 — `foundation` (Wave 0 · foundation)

**Title:** App foundation, Clerk authentication, secure Convex identity, and schema  

**Owns (and only this ticket may edit):**
- `package.json` / lockfile (Next, Convex, Clerk, Tailwind, test runners, map client deps)
- `convex/schema.ts` — **complete** v1 schema for all entities below
- Convex auth config + identity helpers (`getAuthedUser`, fail-closed)
- Clerk middleware, sign-in/sign-up routes, branded public landing
- App shell routes and nav placeholders: `/`, `/event/[eventId]`, `/bookmarks`, `/settings`
- Global dark operational theme tokens (`app/globals.css`, layout fonts via `next/font`)
- Shared types, allowlisted enums (category, severity, time window, provider id)
- Validation helpers for coordinates, timestamps, https-only URLs
- CSP / security response headers skeleton in Next config
- Empty/unauthorized/loading skeleton states for shell

**Success looks like:**
- Unauthenticated user sees MSWlab-branded landing and can sign in via Clerk.
- Authenticated user reaches a gated shell with product name and nav; no cross-user identity from client-supplied IDs.
- Schema deploys; typecheck passes against full data model.

**PRD criteria advanced:** §4.1 auth, §5 schema, §9 auth basics, §11 routes (stubs), §14.1

---

### T2 — `ingestion` (Wave 1)

**Title:** Synthetic data provider, seed workflow, ingestion model, and priority scoring  

**Depends on:** `foundation`  

**Builds:**
- Provider interface + normalize → internal event model
- Synthetic provider: 25–40 clearly labeled demo events across regions/categories
- Idempotent upsert by `externalId`
- `ingestionRuns` recording (success/failure, counts, error summary)
- Convex scheduled job hook for provider refresh (synthetic re-seed/refresh safe)
- Deterministic `priorityScore` pure function + plain-language rank explanation builder
- Server-only admin/internal mutations for seed/refresh; **not** callable as ordinary client write paths
- Persistent “Demo data” flag/query when synthetic dataset is active
- Unit tests: scoring, normalization, validation of provider payloads

**Success looks like:**
- Seeded Convex contains demo events; dashboard queries can list them by time/severity/category.
- Failed refresh preserves prior successful rows; run history is queryable.
- Priority order is explainable and unit-tested.

**PRD criteria advanced:** §6 data strategy, §7 priority model, §14.2–3,7,13 (scoring/normalization tests)

---

### T3 — `dashboard-shell` (Wave 2)

**Title:** Dashboard shell, filters, overview metrics, and responsive layout  

**Depends on:** `foundation`, `ingestion`  

**Builds:**
- Four-region layout: header · left filter rail · central map slot · right feed slot
- Header: product name, UTC clock, data freshness, global search UI, user menu, manual refresh control
- Filters: categories, severity, region, time window, bookmarked-only, reset
- Shared client filter state hydrated from `userPreferences` when present (read path; write lands in T5)
- Situation overview metrics from Convex (critical count, high count, elevated regions, last-24h adds, last successful refresh)
- Demo-data and stale-data banners
- Responsive desktop/tablet breakpoints; empty and loading states for filtered results
- Filter change product analytics events (no search-text logging)

**Success looks like:**
- Authenticated user sees a coherent ops console; changing filters updates overview metrics and reserved map/feed slots consistently (even if map/feed are placeholders until T4/T5).

**PRD criteria advanced:** §4.2 layout/filters/overview, §4.4, §12 loading/empty/stale (shell-level), §13 filter analytics

---

### T4 — `map` (Wave 3)

**Title:** Interactive map, clustered event markers, and accessible list fallback  

**Depends on:** `foundation`, `ingestion`, `dashboard-shell`  

**Builds:**
- Server-safe map integration (no map secrets in `NEXT_PUBLIC_*`)
- Clustered markers; category via icon/shape; severity via color
- Marker select → opens detail focus (shared selection context with feed)
- Hover/focus preview; keyboard-accessible event list alternative to the map
- Graceful fallback when map provider is unset or fails
- Markers respect active filters; real-time Convex subscription updates

**Success looks like:**
- User can locate events geographically, select a marker, and use an accessible list when map is unavailable.

**PRD criteria advanced:** §4.2 central map, §12 map unavailable, §9 secrets for map, §14.2–4

---

### T5 — `feed-details` (Wave 3)

**Title:** Intelligence feed, synchronized event details, bookmarks, and preferences  

**Depends on:** `foundation`, `ingestion`, `dashboard-shell`  

**Builds:**
- Priority-ordered intelligence feed cards (headline, category, severity, location, relative time, summary, source count, confidence, bookmark)
- Feed ↔ map selection synchronization via shared dashboard selection state
- Event detail panel + `/event/[eventId]` shareable authenticated route
- Detail content: structured summary, severity/confidence, location, timestamps, source links (https only, text-rendered), “why it matters” (rank explanation), related events, bookmark, “Report an issue”
- Clear labeling: verified source facts vs system-generated summaries vs analyst notes; never present AI summary as verified fact
- Bookmarks: mutations scoped to authed user; `/bookmarks` page
- Preferences: categories, regions, time window, preferredView; private to Clerk user; `/settings`
- Product analytics: event opened, source followed, bookmarked, refresh requested (no event body / search text)

**Success looks like:**
- Selecting feed or map opens the same detail; bookmarks and preferences persist across sessions; another user cannot read/write them.

**PRD criteria advanced:** §4.2 feed, §4.3 detail, §4.5 prefs, §10 disclosures, §11 routes, §14.4–10

---

### T6 — `hardening` (Wave 4)

**Title:** Security hardening, accessibility, automated tests, observability, and Vercel verification  

**Depends on:** `foundation`, `ingestion`, `dashboard-shell`, `map`, `feed-details`  

**Builds:**
- Authz audit: every private query/mutation; bookmark/preference isolation tests
- Input allowlists, XSS-safe rendering, open-redirect prevention, SSRF-safe external fetch limits
- Rate-limit manual refresh / ingestion triggers
- Full state matrix: offline, partial/complete provider failure, invalid event URL, unauthorized
- Unit tests complete for scoring, normalization, validation, authz helpers
- Playwright: sign-in, filter, select event, bookmark, empty states
- CSP/headers final pass; no trackers; privacy-conscious analytics only
- Production build: typecheck, lint, tests
- Document release gates: preview verified ≠ production; production requires explicit human approval

**Success looks like:**
- Definition of Done §14.1–16 satisfied at the engineering level; preview deploy path documented; production not auto-claimed.

**PRD criteria advanced:** §9, §12 remaining, §13, §14, §17 gates

---

## 2. Dependencies and implementation waves

```
Wave 0  foundation ─────────────────────────────── alone (coherent base)
              │
              ▼
Wave 1  ingestion ──────────────────────────────── data + scoring
              │
              ▼
Wave 2  dashboard-shell ────────────────────────── layout + filters + metrics
              │
        ┌─────┴─────┐
        ▼           ▼
Wave 3  map      feed-details ──────────────────── may parallelize (shared selection API from shell)
        │           │
        └─────┬─────┘
              ▼
Wave 4  hardening ──────────────────────────────── after all feature tickets staged
```

| Wave | Tickets | Parallelism rule |
|------|---------|------------------|
| 0 | `foundation` | Single ticket only |
| 1 | `ingestion` | After foundation staged/merged |
| 2 | `dashboard-shell` | After foundation + ingestion staged |
| 3 | `map`, `feed-details` | Both after shell + ingestion; may run in parallel if concurrency caps allow |
| 4 | `hardening` | After all of the above staged |

**Merge rule (gboard waves):** a ticket is codeable only when every `dependsOn` ticket is staged (or production), not merely coded.

**Dependency map:**

| Ticket | dependsOn |
|--------|-----------|
| `foundation` | — |
| `ingestion` | `foundation` |
| `dashboard-shell` | `foundation`, `ingestion` |
| `map` | `foundation`, `ingestion`, `dashboard-shell` |
| `feed-details` | `foundation`, `ingestion`, `dashboard-shell` |
| `hardening` | `foundation`, `ingestion`, `dashboard-shell`, `map`, `feed-details` |

**Contract between T3 and T4/T5:** dashboard-shell exposes a shared selection + filter context (React context or equivalent) so map and feed stay synchronized without either ticket owning the other’s files.

---

## 3. Database schema

Convex tables (foundation lands all of these). Types shown conceptually; implement with Convex validators and allowlisted unions.

### `users`
| Field | Type | Notes |
|-------|------|--------|
| `clerkUserId` | string | Indexed unique lookup |
| `displayName` | string | |
| `email` | string? | Only if needed for display |
| `createdAt` | number | |
| `updatedAt` | number | |

Identity always from Clerk JWT via Convex auth — never trust client `userId`.

### `events`
| Field | Type | Notes |
|-------|------|--------|
| `externalId` | string | Idempotency key; unique per provider |
| `headline` | string | |
| `summary` | string | Untrusted text; render as text |
| `category` | union | geopolitical \| infrastructure \| weather \| public_health \| cybersecurity \| transportation \| energy \| economic |
| `severity` | union | critical \| high \| moderate \| informational |
| `confidence` | union | e.g. high \| medium \| low (or numeric 0–1 with labels) |
| `countryCode` | string | ISO-ish short code |
| `region` | string | Display region |
| `latitude` | number | Validated range |
| `longitude` | number | Validated range |
| `occurredAt` | number | |
| `firstObservedAt` | number | |
| `updatedAt` | number | |
| `sourceCount` | number | |
| `status` | union | active \| resolved \| archived |
| `priorityScore` | number | Deterministic |
| `generatedContentDisclosure` | string | Required when summary is system-generated |
| `ingestionSource` | string | e.g. `synthetic` \| future provider id |
| `isSynthetic` | boolean | Drives “Demo data” UX |
| `whyItMatters` | string? | Optional short operational note |

### `eventSources`
| Field | Type | Notes |
|-------|------|--------|
| `eventId` | Id\<events\> | Indexed |
| `publisher` | string | |
| `sourceUrl` | string | https only |
| `publishedAt` | number? | |
| `title` | string | Untrusted text |
| `verificationStatus` | union | unverified \| corroborated \| official |

### `userPreferences`
| Field | Type | Notes |
|-------|------|--------|
| `userId` | Id\<users\> | One doc per user; authz by owner |
| `selectedCategories` | string[] | Allowlisted |
| `selectedRegions` | string[] | |
| `timeWindow` | union | `6h` \| `24h` \| `7d` |
| `preferredView` | union | `map` \| `list` \| `split` |
| `updatedAt` | number | |

### `bookmarks`
| Field | Type | Notes |
|-------|------|--------|
| `userId` | Id\<users\> | Composite uniqueness with eventId |
| `eventId` | Id\<events\> | |
| `createdAt` | number | |

### `ingestionRuns`
| Field | Type | Notes |
|-------|------|--------|
| `provider` | string | Allowlisted |
| `startedAt` | number | |
| `completedAt` | number? | |
| `status` | union | running \| succeeded \| failed \| partial |
| `recordsReceived` | number | |
| `recordsCreated` | number | |
| `recordsUpdated` | number | |
| `errorSummary` | string? | No secrets |

### Indexes (minimum)
- `events`: by `externalId`; by `occurredAt`; by `severity` + `occurredAt`; by `category` + `occurredAt`; by `region` + `occurredAt`; by `priorityScore`; by `ingestionSource`
- `eventSources`: by `eventId`
- `users`: by `clerkUserId`
- `userPreferences`: by `userId`
- `bookmarks`: by `userId`; by `userId` + `eventId`
- `ingestionRuns`: by `provider` + `startedAt`; by `status` + `startedAt`

---

## 4. External data sources

| Source | v1 role | Credentials | Notes |
|--------|---------|-------------|--------|
| **Synthetic provider** | Primary / required | None | 25–40 demo events; always labeled; never presented as live world truth |
| **Map tile / geocoding provider** (optional) | Map rendering | Server-side only if needed; prefer tokenless public styles or server-proxied tiles | If unset → accessible list + static world fallback; app still boots |
| **Optional free open feed** | Stretch only | Server-side only | Implement **only** if ToS-safe, stable, no scraping, short summaries + outbound links; default plan is **synthetic-only** for v1 reliability |

**Not in v1:** paid intel feeds, social firehose, full-text article storage, user-defined sources, scrapers.

**Refresh:** Convex cron/scheduled function calls provider adapter → normalize → idempotent upsert → `ingestionRuns` row. On failure, keep last good event set and surface stale status.

---

## 5. Environment variables

### Public (browser-safe)
| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk client |
| `NEXT_PUBLIC_CONVEX_URL` | Convex client URL |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` (or project convention) |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-up` |
| `NEXT_PUBLIC_APP_URL` | Canonical origin (links, redirects) |

### Server / Convex only (never `NEXT_PUBLIC_*`)
| Variable | Purpose |
|----------|---------|
| `CLERK_SECRET_KEY` | Clerk server |
| `CLERK_JWT_ISSUER_DOMAIN` / Convex Clerk JWT config | Convex auth validation |
| `CONVEX_DEPLOY_KEY` | Deploy / CI |
| `MAP_PROVIDER_API_KEY` (optional) | Server-side map if required |
| `INGESTION_CRON_SECRET` or Convex internal auth | Protect manual/admin refresh if exposed via HTTP |
| `E2E_CLERK_*` (test only) | Playwright auth fixtures |

### Explicit non-goals for env
- No analytics/tracker keys in v1
- No browser-exposed map or ingestion secrets
- Fail gracefully if optional map/provider keys missing; fail closed if Clerk/Convex auth misconfigured for protected routes

---

## 6. Security and privacy boundaries

### Authentication & authorization
- All private Convex queries/mutations require authenticated identity from Clerk session.
- User record resolved server-side from `clerkUserId`; client cannot assert another user’s id.
- Preferences and bookmarks: owner-only read/write.
- Ingestion seed/refresh: internal/system or highly restricted path — not ordinary user mutations.
- Fail closed on missing auth.

### Input / output safety
- Allowlist categories, severities, time windows, provider ids, preferred views.
- Validate lat/lon ranges and timestamp finiteness.
- Render headlines/summaries/source titles as **text**, never raw HTML.
- Source links: `https:` only; no open redirects.
- Treat all ingested text as untrusted (XSS).

### Secrets & egress
- Credentials only in server/Convex env.
- External fetch: timeouts, max body size, schema validation; no user-controlled arbitrary URLs (SSRF).
- Logs: operational outcomes only — no tokens, secrets, or full sensitive payloads.

### Browser
- CSP + secure headers; avoid unsafe inline scripts.
- No third-party analytics/trackers in v1.
- Minimize frontend deps.

### Privacy & product claims
- No PHI / patient-level data; no user surveillance or location tracking of operators.
- Not an emergency alerting system or authoritative government intel source.
- Synthetic data always labeled; generated summaries always disclosed.
- Analytics: product actions only — no search text, no event body content, unless later approved.
- “Report an issue” collects minimal product feedback, not clinical data.

### Operational
- Rate-limit manual refresh.
- Provider outage must not wipe last successful dataset.
- Production deploy requires **explicit human approval** after preview verification (see §17 gates in PRD).

---

## 7. Explicitly deferred features

Out of scope for v1 (do not implement in these tickets):

- AI-generated forecasting or predictive threat models  
- Automated emergency alerts (SMS, email, Slack, push)  
- Paid intelligence feeds; social-media firehose  
- Full-text article storage / scrapers / ToS-violating collection  
- Native mobile or desktop apps; offline-first  
- Multi-tenant orgs and advanced RBAC  
- Analyst collaboration, shared annotations  
- Public unauthenticated event sharing pages  
- User-created ingestion sources  
- Fifty-plus map layers; live military asset tracking  
- Clinical / patient information  
- Claims of authoritative intelligence  
- Copying WorldMonitor source, branding, logos, or visual assets  

---

## Visual direction (implementation note for foundation)

Original operational console (not WorldMonitor clone, not gboard warm-paper Signature UI):

- Dark neutral ground; restrained cyan/blue accents  
- Amber/red reserved for risk severity  
- Dense but readable hierarchy; WCAG 2.1 AA  
- Subtle state motion only; full `prefers-reduced-motion`  
- Structure follows gboard stack conventions (App Router, Convex modules, Clerk middleware, Tailwind token discipline) while tokens match this product’s dark ops aesthetic  

---

## Release gates (do not collapse)

1. PRD approved  
2. **Tickets/plan approved** ← current stop  
3. Implementation complete (waves 0–4)  
4. Automated tests passing  
5. Security review complete  
6. Preview deployment verified  
7. Production deployment **explicitly approved**  
8. Production deployment verified  

Do not describe merged code as deployed. Do not treat a green Vercel build as verified production behavior.

---

## Definition of done (plan coverage checklist)

| DoD item | Ticket(s) |
|----------|-----------|
| Clerk sign-in | foundation |
| Map + feed synthetic events | ingestion, map, feed-details |
| Filters sync map/feed/overview | dashboard-shell, map, feed-details |
| Single detail from either surface | feed-details (+ map selection) |
| Bookmarks `/bookmarks` | feed-details |
| Preferences persist | feed-details |
| Demo data labeled | ingestion, dashboard-shell |
| Source links + generated-content disclosure | feed-details, ingestion |
| Cross-user authz | foundation, feed-details, hardening |
| Input validation + safe render | foundation, hardening |
| Missing credentials / outages | map, ingestion, hardening |
| Keyboard + WCAG AA | dashboard-shell, map, feed-details, hardening |
| Unit tests scoring/normalize/validate/authz | ingestion, foundation, hardening |
| Browser tests core flows | hardening |
| Build + security review + preview | hardening |

---

## READY FOR REVIEW

Awaiting explicit approval of:

1. Proposed tickets (6)  
2. Dependencies and implementation waves  
3. Database schema  
4. External data sources  
5. Environment variables  
6. Security and privacy boundaries  
7. Explicitly deferred features  

**No implementation will start until you approve this plan** (or request revisions).
