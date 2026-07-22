# Security review notes — Global Situation Monitor v1

## AuthN / AuthZ

- Clerk protects `/bookmarks`, `/settings`, `/event/*` via middleware (`proxy.ts`).
- Convex queries/mutations call `ctx.auth.getUserIdentity()` and fail closed when missing.
- Local `users` rows are keyed by Clerk `subject`; never by client-supplied IDs.
- `userPreferences` and `bookmarks` are indexed by `userId` and only mutated after `requireUser`.
- Ingestion `runProvider` is `internalMutation` only; manual refresh is rate-limited.

## Input / output

- Categories, severities, time windows, preferred views, and providers are allowlisted.
- Coordinates and timestamps validated; source URLs must be `https:`.
- Summaries and titles rendered as React text nodes (not HTML).
- Analytics rejects unknown event names and caps meta size; no search text storage by design.

## Secrets

- Map/provider secrets (if any) must be server-side only — not `NEXT_PUBLIC_*`.
- CSP + frame/nosniff/referrer/permissions headers in `next.config.ts`.
- No third-party analytics trackers in v1.

## Residual risks / follow-ups

- Replace placeholder `CLERK_JWT_ISSUER_DOMAIN` with the real Clerk JWT template issuer before production auth works end-to-end.
- In-memory manual-refresh rate limit is best-effort per isolate; harden with durable counters if abuse appears.
- Browser E2E for signed-in flows needs Clerk test users (`E2E_CLERK_*`) — not configured in CI by default.
- Production deploy requires explicit human approval after preview verification.
