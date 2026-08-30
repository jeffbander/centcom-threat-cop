"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  DashboardProvider,
  useDashboard,
  type FilterState,
} from "./DashboardContext";
import { Header } from "./Header";
import { CopSettingsPanel } from "./CopSettingsPanel";
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
import { AorWatchStack } from "./UkraineWatch";
import { ClassificationStrip } from "./ClassificationStrip";
import { CopHotkeys } from "./CopHotkeys";
import { CopShare } from "./CopShare";
import {
  ShowOverlayControls,
  type OverlayToggles,
} from "./ShowOverlayControls";
import { parseCopView, type CopLayerKey } from "@/lib/copView";
import { THEATER_MISSIONS } from "@/lib/theaters";
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
    forces: false,
    satellites: true,
    firms: true,
    adsb: true,
    quakes: true,
    ais: true,
    launches: true,
    acled: true,
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
  const quakeSnap = useQuery(api.layers.getSnapshot, { layer: "quakes", now });
  const aisSnap = useQuery(api.layers.getSnapshot, { layer: "ais", now });
  const launchSnap = useQuery(api.layers.getSnapshot, {
    layer: "launches",
    now,
  });
  const acledSnap = useQuery(api.layers.getSnapshot, { layer: "acled", now });
  const [rightTab, setRightTab] = useState<"sitrep" | "threat" | "xosint">(
    "sitrep",
  );
  const { requestMapFocus } = useDashboard();
  const viewApplied = useRef(false);

  useEffect(() => {
    if (viewApplied.current) return;
    if (typeof window === "undefined") return;
    viewApplied.current = true;
    const view = parseCopView(window.location.search);
    if (view.layers) {
      const on = new Set(view.layers);
      setOverlays((prev) => ({
        ...prev,
        firms: on.has("firms"),
        satellites: on.has("satellites"),
        adsb: on.has("adsb"),
        quakes: on.has("quakes"),
        ais: on.has("ais"),
        launches: on.has("launches"),
        acled: on.has("acled"),
      }));
    }
    if (view.ao) {
      const m = THEATER_MISSIONS.find((t) => t.id === view.ao);
      if (m) requestMapFocus(m.latitude, m.longitude, m.zoom);
    }
  }, [requestMapFocus]);

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
          quakeCount={quakeSnap?.recordsReceived ?? 0}
          aisCount={aisSnap?.recordsReceived ?? 0}
          launchCount={launchSnap?.recordsReceived ?? 0}
          firmsStatus={firmsSnap?.status ?? "…"}
          satStatus={satSnap?.status ?? "…"}
          adsbStatus={adsbSnap?.status ?? "…"}
          quakeStatus={quakeSnap?.status ?? "…"}
          aisStatus={aisSnap?.status ?? "…"}
          launchStatus={launchSnap?.status ?? "…"}
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
        quakeChip={
          quakeSnap
            ? { status: quakeSnap.status, count: quakeSnap.recordsReceived }
            : undefined
        }
        aisChip={
          aisSnap
            ? { status: aisSnap.status, count: aisSnap.recordsReceived }
            : undefined
        }
        launchChip={
          launchSnap
            ? { status: launchSnap.status, count: launchSnap.recordsReceived }
            : undefined
        }
        acledChip={
          acledSnap
            ? { status: acledSnap.status, count: acledSnap.recordsReceived }
            : undefined
        }
      />
      <div className="flex items-center">
        <div className="flex-1 min-w-0">
          <TheaterMissions />
        </div>
        <div className="shrink-0 pr-2 py-1 border-b border-[var(--border)] bg-[#070b10] text-[10px] font-mono">
          <CopShare
            enabledLayers={
              (
                [
                  overlays.firms && "firms",
                  overlays.satellites && "satellites",
                  overlays.adsb && "adsb",
                  overlays.quakes && "quakes",
                  overlays.ais && "ais",
                  overlays.launches && "launches",
                  overlays.acled && "acled",
                ] as const
              ).filter(Boolean) as CopLayerKey[]
            }
          />
        </div>
      </div>
      {overlays.newsWire && <NewsTicker />}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        <EventMap
          showSatellites={overlays.satellites}
          showAois={overlays.aois}
          showOsintInfra={overlays.osintInfra}
          showFirms={overlays.firms}
          showAdsb={overlays.adsb}
          showQuakes={overlays.quakes}
          showAis={overlays.ais}
          showLaunches={overlays.launches}
          showAcled={overlays.acled}
        />
        <div className="w-full lg:w-[min(36vw,460px)] xl:w-[480px] shrink-0 flex flex-col min-h-0 border-l border-[var(--border)]">
          <div className="shrink-0 max-h-[28vh] overflow-y-auto gsm-scroll">
            <ContactSubjectPanel />
          </div>
          <SatelliteLinkStatus />
          <div
            className="flex shrink-0 border-b border-[var(--border)] bg-[var(--bg-elevated)] text-xs font-mono uppercase tracking-[0.1em]"
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
          <div
            id="cop-right-scroll"
            className="flex-1 min-h-0 overflow-y-auto gsm-scroll overscroll-contain"
          >
            <AorWatchStack />
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
      <CopSettingsPanel />
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
