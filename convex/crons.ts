import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

/** Refresh open-source threat feeds every 2 hours (public free APIs only). */
crons.interval(
  "open source multi-provider refresh",
  { hours: 2 },
  internal.providers.fetchOpenSources.refreshAll,
  { clearSynthetic: true },
);

/** FIRMS + TLE snapshots — contacts, not events. */
crons.interval(
  "live overlay layer snapshots",
  { minutes: 30 },
  internal.providers.fetchLayers.refresh,
  { layer: "all" },
);

/** Military ADS-B refreshes faster than fires/TLEs. */
crons.interval(
  "military ADS-B overlay",
  { minutes: 2 },
  internal.providers.fetchLayers.refresh,
  { layer: "adsb" },
);

// X OSINT polling is intentionally NOT on a Convex cron.
// It only runs from the logged-in client while the app is open
// (see components/dashboard/XOsintPoller.tsx — every 30 minutes).

export default crons;
