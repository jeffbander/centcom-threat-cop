/**
 * Analyst query over currently loaded COP records (events + FIRMS + satellites).
 * Client-side only — answers cover loaded data, not global completeness.
 */

import { haversineKm, type LatLon } from "./spatialJoin";

export const ANALYST_LAYERS = ["events", "firms", "satellites"] as const;
export type AnalystLayerKey = (typeof ANALYST_LAYERS)[number];

export const LOADED_DATA_COVERAGE_NOTE =
  "loaded-data-only — answers cover currently loaded events, FIRMS, and satellite records, not global completeness";

export type AnalystRecord = {
  layerKey: AnalystLayerKey;
  id: string;
  latitude: number;
  longitude: number;
  headline?: string;
  frp?: number;
  name?: string;
  norad?: string;
  acquiredAt?: number;
  [field: string]: string | number | boolean | undefined;
};

export type AnalystFilterOp = "gt" | "lt" | "gte" | "lte" | "eq" | "neq" | "contains";

export type AnalystFilter = {
  field: string;
  op: AnalystFilterOp;
  value: string | number | boolean;
};

export type AnalystScope =
  | { kind: "anywhere" }
  | { kind: "radius"; center: LatLon; km: number };

export type AnalystQuerySpec = {
  layers?: AnalystLayerKey[];
  filters?: AnalystFilter[];
  scope?: AnalystScope;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  limit?: number;
  followUp?: boolean;
};

export type AnalystQueryResult = {
  ok: boolean;
  count: number;
  items: AnalystRecord[];
  truncated: boolean;
  coverageNote: string;
  coverage: {
    layersQueried: Array<{ layerKey: AnalystLayerKey; records: number }>;
    scope: string;
    followUp: boolean;
    note: string;
  };
  error?: string;
};

function applyFilter(records: AnalystRecord[], filter: AnalystFilter): AnalystRecord[] {
  const { field, op, value } = filter;
  if (!field || !op) return records;
  return records.filter((r) => {
    const got = r[field];
    if (got === undefined || got === null) return false;
    switch (op) {
      case "gt":
        return Number(got) > Number(value);
      case "gte":
        return Number(got) >= Number(value);
      case "lt":
        return Number(got) < Number(value);
      case "lte":
        return Number(got) <= Number(value);
      case "eq":
        if (typeof got === "boolean" || typeof value === "boolean") {
          return Boolean(got) === Boolean(value);
        }
        return String(got).toLowerCase() === String(value).toLowerCase();
      case "neq":
        return String(got).toLowerCase() !== String(value).toLowerCase();
      case "contains":
        return String(got).toLowerCase().includes(String(value).toLowerCase());
      default:
        return true;
    }
  });
}

function applyScope(records: AnalystRecord[], scope: AnalystScope | undefined): AnalystRecord[] {
  if (!scope || scope.kind === "anywhere") return records;
  if (scope.kind === "radius") {
    const km = Number(scope.km);
    if (!Number.isFinite(km)) return records;
    return records.filter(
      (r) =>
        Number.isFinite(r.latitude) &&
        Number.isFinite(r.longitude) &&
        haversineKm(scope.center, {
          latitude: r.latitude,
          longitude: r.longitude,
        }) <= km,
    );
  }
  return records;
}

export function runAnalystQuery(
  records: AnalystRecord[],
  spec: AnalystQuerySpec = {},
): AnalystQueryResult {
  const requested = spec.layers?.length
    ? spec.layers
    : ([...ANALYST_LAYERS] as AnalystLayerKey[]);
  const unknown = requested.filter(
    (k) => !(ANALYST_LAYERS as readonly string[]).includes(k),
  );
  if (unknown.length) {
    return {
      ok: false,
      count: 0,
      items: [],
      truncated: false,
      coverageNote: LOADED_DATA_COVERAGE_NOTE,
      coverage: {
        layersQueried: [],
        scope: "unsupported-layer",
        followUp: false,
        note: LOADED_DATA_COVERAGE_NOTE,
      },
      error: `Unsupported layer: ${unknown.join(", ")}`,
    };
  }

  const layersQueried = requested.map((layerKey) => ({
    layerKey,
    records: records.filter((r) => r.layerKey === layerKey).length,
  }));

  let items = records.filter((r) => requested.includes(r.layerKey));
  items = applyScope(items, spec.scope);
  for (const f of spec.filters ?? []) items = applyFilter(items, f);

  const sortBy = spec.sortBy;
  if (sortBy) {
    const dir = spec.sortDir === "asc" ? 1 : -1;
    items = [...items].sort((a, b) => {
      const av = a[sortBy];
      const bv = b[sortBy];
      const an = Number(av);
      const bn = Number(bv);
      if (Number.isFinite(an) && Number.isFinite(bn) && an !== bn) {
        return (an - bn) * dir;
      }
      return String(a.id).localeCompare(String(b.id));
    });
  }

  const limit = Math.max(1, Math.min(500, Number(spec.limit) || 10));
  const top = items.slice(0, limit);
  return {
    ok: true,
    count: items.length,
    items: top,
    truncated: items.length > top.length,
    coverageNote: LOADED_DATA_COVERAGE_NOTE,
    coverage: {
      layersQueried,
      scope: spec.scope?.kind ?? "anywhere",
      followUp: Boolean(spec.followUp),
      note: LOADED_DATA_COVERAGE_NOTE,
    },
  };
}

export function createAnalystEngine(getRecords: () => AnalystRecord[]) {
  let lastItems: AnalystRecord[] | null = null;

  return {
    query(spec: AnalystQuerySpec = {}): AnalystQueryResult {
      const followUp = Boolean(spec.followUp && lastItems);
      const source = followUp && lastItems ? lastItems : getRecords();
      const displayLimit = Math.max(1, Math.min(50, Number(spec.limit) || 10));
      const result = runAnalystQuery(source, {
        ...spec,
        followUp,
        limit: 500,
      });
      if (result.ok) {
        lastItems = result.items;
        return {
          ...result,
          items: result.items.slice(0, displayLimit),
          truncated: result.count > displayLimit,
        };
      }
      return result;
    },
    reset() {
      lastItems = null;
    },
    hasMemory() {
      return lastItems != null;
    },
  };
}
