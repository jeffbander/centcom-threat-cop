"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Category, PreferredView, Severity, TimeWindow } from "@/lib/constants";
import type { Id } from "@/convex/_generated/dataModel";

export type SelectedContact = {
  kind: "firms" | "satellite" | "adsb" | "quake" | "ais" | "launch" | "acled";
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  subtitle: string;
  details: Array<{ label: string; value: string }>;
  provenance: string;
};

export type FilterState = {
  categories: Category[];
  severities: Severity[];
  regions: string[];
  timeWindow: TimeWindow;
  bookmarkedOnly: boolean;
  search: string;
};

export type DashboardContextValue = {
  filters: FilterState;
  setFilters: (patch: Partial<FilterState>) => void;
  resetFilters: () => void;
  selectedEventId: Id<"events"> | null;
  setSelectedEventId: (id: Id<"events"> | null) => void;
  selectedContact: SelectedContact | null;
  setSelectedContact: (contact: SelectedContact | null) => void;
  mapFocus: { latitude: number; longitude: number; zoom: number; nonce: number } | null;
  requestMapFocus: (latitude: number, longitude: number, zoom: number) => void;
  preferredView: PreferredView;
  setPreferredView: (v: PreferredView) => void;
  detailOpen: boolean;
  setDetailOpen: (open: boolean) => void;
};

const DEFAULT_FILTERS: FilterState = {
  categories: [],
  severities: [],
  regions: [],
  timeWindow: "7d",
  bookmarkedOnly: false,
  search: "",
};

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function DashboardProvider({
  children,
  initial,
}: {
  children: ReactNode;
  initial?: Partial<FilterState> & { preferredView?: PreferredView };
}) {
  const [filters, setFiltersState] = useState<FilterState>({
    ...DEFAULT_FILTERS,
    ...initial,
  });
  const [selectedEventId, setSelectedEventId] = useState<Id<"events"> | null>(
    null,
  );
  const [selectedContact, setSelectedContact] =
    useState<SelectedContact | null>(null);
  const [preferredView, setPreferredView] = useState<PreferredView>(
    initial?.preferredView ?? "split",
  );
  const [detailOpen, setDetailOpen] = useState(false);
  const [mapFocus, setMapFocus] = useState<{
    latitude: number;
    longitude: number;
    zoom: number;
    nonce: number;
  } | null>(null);

  const setFilters = useCallback((patch: Partial<FilterState>) => {
    setFiltersState((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
  }, []);

  const value = useMemo(
    () => ({
      filters,
      setFilters,
      resetFilters,
      selectedEventId,
      setSelectedEventId: (id: Id<"events"> | null) => {
        setSelectedEventId(id);
        if (id) setSelectedContact(null);
        setDetailOpen(!!id);
      },
      selectedContact,
      setSelectedContact: (contact: SelectedContact | null) => {
        setSelectedContact(contact);
        if (contact) {
          setSelectedEventId(null);
          setDetailOpen(false);
        }
      },
      mapFocus,
      requestMapFocus: (latitude: number, longitude: number, zoom: number) => {
        setMapFocus({ latitude, longitude, zoom, nonce: Date.now() });
      },
      preferredView,
      setPreferredView,
      detailOpen,
      setDetailOpen,
    }),
    [
      filters,
      setFilters,
      resetFilters,
      selectedEventId,
      selectedContact,
      mapFocus,
      preferredView,
      detailOpen,
    ],
  );

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard must be used within DashboardProvider");
  return ctx;
}
