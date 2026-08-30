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
import { SituationBrief } from "./SituationBrief";
import { ContactSubjectPanel } from "./ContactSubjectPanel";
import { LayerPoller } from "./LayerPoller";
import { SatelliteLinkStatus } from "./SatelliteLinkStatus";
import { EventDetailPanel } from "./EventDetailPanel";
import { NewsTicker } from "./NewsTicker";
import { MilitaryHud } from "./MilitaryHud";
import { TheaterMissions } from "./TheaterMissions";
import { ClassificationStrip } from "./ClassificationStrip";
import { CopHotkeys } from "./CopHotkeys";
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
    firms: true,
    adsb: true,
    newsWire: false,
    aois: true,
    rangeRings: false,
    milHud: true,
    xOsint: true,
    osintInfra: true,
  });
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, []);
  const firmsSnap = useQuery(api.layers.getSnapshot, { layer: "firms", now });
  const satSnap = useQuery(api.layers.getSnapshot, {
    layer: "satellites",
    now,
  });
  const adsbSnap = useQuery(api.layers.getSnapshot, { layer: "adsb", now });
  const [rightTab, setRightTab] = useState<"sitrep" | "threat" | "xosint">(
    "sitrep",
  );

  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    void (async () => {
      try {
        await ensureUser({});
        await bootstrap({});
        try {
          await seedX({});
        } catch {
          /* optional */
        }
        trackProductEvent({ name: "dashboard_viewed" });
        void track({ name: "dashboard_viewed" });
      } catch {
        bootstrapped.current = false;
      }
    })();
  }, [bootstrap, ensureUser, seedX, track]);

  return (
    <div className="h-screen flex flex-col overflow-hidden gsm-mil-console">
      {/* X polls only while this authenticated dashboard is mounted */}
      <XOsintPoller enabled={overlays.xOsint} />
      <LayerPoller />
      <CopHotkeys />
      <ClassificationStrip position="top" />
      <Header />
      {overlays.milHud ? (
        <MilitaryHud
          firmsCount={firmsSnap?.recordsReceived ?? 0}
          satCount={satSnap?.recordsReceived ?? 0}
          adsbCount={adsbSnap?.recordsReceived ?? 0}
          firmsStatus={firmsSnap?.status ?? "…"}
          satStatus={satSnap?.status ?? "…"}
          adsbStatus={adsbSnap?.status ?? "…"}
        />
      ) : (
        <OverviewBar />
      )}
      <ShowOverlayControls
        value={overlays}
        onChange={setOverlays}
        firmsChip={
          firmsSnap
            ? {
                status: firmsSnap.status,
                count: firmsSnap.recordsReceived,
              }
            : undefined
        }
        satChip={
          satSnap
            ? { status: satSnap.status, count: satSnap.recordsReceived }
            : undefined
        }
        adsbChip={
          adsbSnap
            ? { status: adsbSnap.status, count: adsbSnap.recordsReceived }
            : undefined
        }
      />
      <TheaterMissions />
      {overlays.newsWire && <NewsTicker />}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        <FilterRail />
        <div className="flex-1 flex flex-col lg:flex-row min-h-0 min-w-0">
          <EventMap
            showForces={overlays.forces}
            showSatellites={overlays.satellites}
            showAois={overlays.aois}
            showRangeRings={overlays.rangeRings}
            showOsintInfra={overlays.osintInfra}
            showFirms={overlays.firms}
            showAdsb={overlays.adsb}
          />
          <div className="w-full lg:w-[min(36vw,460px)] xl:w-[480px] shrink-0 flex flex-col min-h-0 border-l border-[var(--border)]">
            <ContactSubjectPanel />
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
                aria-selected={rightTab === "sitrep"}
                onClick={() => setRightTab("sitrep")}
                className={`flex-1 px-2 py-1.5 ${
                  rightTab === "sitrep"
                    ? "text-[var(--accent)] border-b-2 border-[var(--accent)]"
                    : "text-[var(--text-faint)] hover:text-[var(--text)]"
                }`}
              >
                Sitrep
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
                Threat
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={rightTab === "xosint"}
                onClick={() => setRightTab("xosint")}
                className={`flex-1 px-2 py-1.5 ${
                  rightTab === "xosint"
                    ? "text-[var(--critical)] border-b-2 border-[var(--critical)] bg-[var(--critical-wash)]"
                    : "text-[var(--text-faint)] hover:text-[var(--text)]"
                }`}
              >
                X OSINT
              </button>
            </div>
            <div className="flex-1 min-h-0 flex flex-col [&>section]:border-l-0 [&>section]:w-full [&>section]:lg:w-full">
              {rightTab === "sitrep" ? (
                <SituationBrief />
              ) : rightTab === "threat" ? (
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
      <ClassificationStrip position="bottom" />
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
