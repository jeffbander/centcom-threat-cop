"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  DashboardProvider,
  type FilterState,
} from "./DashboardContext";
import { Header } from "./Header";
import { FilterRail } from "./FilterRail";
import { OverviewBar } from "./OverviewBar";
import { EventMap } from "./EventMap";
import { IntelligenceFeed } from "./IntelligenceFeed";
import { XOsintFeed } from "./XOsintFeed";
import { XOsintPoller } from "./XOsintPoller";
import { SatelliteLinkStatus } from "./SatelliteLinkStatus";
import { EventDetailPanel } from "./EventDetailPanel";
import { NewsTicker } from "./NewsTicker";
import { MilitaryHud } from "./MilitaryHud";
import {
  ShowOverlayControls,
  type OverlayToggles,
} from "./ShowOverlayControls";
import type { PreferredView, TimeWindow } from "@/lib/constants";
import { trackProductEvent } from "@/lib/analytics";
import { isTimeWindow, isPreferredView } from "@/lib/constants";

function DashboardInner() {
  const bootstrap = useMutation(api.ingestion.bootstrapIfNeeded);
  const ensureUser = useMutation(api.users.ensureCurrentUser);
  const seedX = useMutation(api.xFeed.seedDefaults);
  const track = useMutation(api.analytics.track);
  const bootstrapped = useRef(false);
  const [overlays, setOverlays] = useState<OverlayToggles>({
    forces: true,
    satellites: true,
    // Default off so Operational Briefing has vertical room
    newsWire: false,
    aois: true,
    rangeRings: false,
    milHud: false,
    xOsint: true,
  });
  const [rightTab, setRightTab] = useState<"threat" | "xosint">("xosint");

  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    void (async () => {
      await ensureUser({});
      await bootstrap({});
      try {
        await seedX({});
      } catch {
        /* optional */
      }
      trackProductEvent({ name: "dashboard_viewed" });
      void track({ name: "dashboard_viewed" });
    })();
  }, [bootstrap, ensureUser, seedX, track]);

  return (
    <div className="h-screen flex flex-col overflow-hidden gsm-mil-console">
      {/* X polls only while this authenticated dashboard is mounted */}
      <XOsintPoller enabled={overlays.xOsint} />
      <Header />
      <OverviewBar />
      <ShowOverlayControls value={overlays} onChange={setOverlays} />
      {overlays.milHud && <MilitaryHud />}
      {overlays.newsWire && <NewsTicker />}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        <FilterRail />
        <div className="flex-1 flex flex-col lg:flex-row min-h-0 min-w-0">
          <EventMap
            showForces={overlays.forces}
            showSatellites={overlays.satellites}
            showAois={overlays.aois}
            showRangeRings={overlays.rangeRings}
          />
          <div className="w-full lg:w-[min(36vw,460px)] xl:w-[480px] shrink-0 flex flex-col min-h-0 border-l border-[var(--border)]">
            {/* Auth / geo monitoring strip — directly above Operational Briefing */}
            <SatelliteLinkStatus />
            <div
              className="flex border-b border-[var(--border)] bg-[var(--bg-elevated)] text-xs font-mono uppercase tracking-[0.1em]"
              role="tablist"
              aria-label="Right rail feeds"
            >
              <button
                type="button"
                role="tab"
                aria-selected={rightTab === "xosint"}
                onClick={() => setRightTab("xosint")}
                className={`flex-[1.4] px-2 py-1.5 ${
                  rightTab === "xosint"
                    ? "text-[var(--critical)] border-b-2 border-[var(--critical)] bg-[var(--critical-wash)]"
                    : "text-[var(--text-faint)] hover:text-[var(--text)]"
                }`}
              >
                Operational Briefing
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={rightTab === "threat"}
                onClick={() => setRightTab("threat")}
                className={`flex-1 px-2 py-1.5 ${
                  rightTab === "threat"
                    ? "text-[var(--accent)] border-b-2 border-[var(--accent)]"
                    : "text-[var(--text-faint)] hover:text-[var(--text)]"
                }`}
              >
                Threat feed
              </button>
            </div>
            <div className="flex-1 min-h-0 flex flex-col [&>section]:border-l-0 [&>section]:w-full [&>section]:lg:w-full">
              {rightTab === "threat" ? (
                <IntelligenceFeed />
              ) : overlays.xOsint ? (
                <XOsintFeed />
              ) : (
                <p className="p-4 text-sm text-[var(--text-muted)]">
                  X OSINT layer hidden — enable in COP layers.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
      <EventDetailPanel />
    </div>
  );
}

export function Dashboard() {
  const prefs = useQuery(api.preferences.get);

  if (prefs === undefined) {
    return (
      <div className="h-screen flex items-center justify-center text-[var(--text-muted)]">
        Loading CENTCOM COP…
      </div>
    );
  }

  const initial: Partial<FilterState> & { preferredView?: PreferredView } = {};
  if (prefs) {
    if (prefs.selectedCategories?.length) {
      initial.categories = prefs.selectedCategories as FilterState["categories"];
    }
    if (prefs.selectedRegions?.length) {
      initial.regions = prefs.selectedRegions;
    }
    if (prefs.timeWindow && isTimeWindow(prefs.timeWindow)) {
      initial.timeWindow = prefs.timeWindow as TimeWindow;
    }
    if (prefs.preferredView && isPreferredView(prefs.preferredView)) {
      initial.preferredView = prefs.preferredView as PreferredView;
    }
  }

  return (
    <DashboardProvider initial={initial}>
      <DashboardInner />
    </DashboardProvider>
  );
}
