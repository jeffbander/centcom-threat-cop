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

// X OSINT polling is intentionally NOT on a Convex cron.
// It only runs from the logged-in client while the app is open
// (see components/dashboard/XOsintPoller.tsx — every 30 minutes).

export default crons;
