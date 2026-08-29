/**
 * CelesTrak GP/OMM + classic TLE → geodetic lat/lon via SGP4.
 * Positions are time-propagated; not decorative tracks.
 */

import {
  json2satrec,
  twoline2satrec,
  propagate,
  gstime,
  eciToGeodetic,
  degreesLat,
  degreesLong,
  type OMMJsonObject,
} from "satellite.js";

export type OmmRecord = {
  OBJECT_NAME: string;
  OBJECT_ID?: string;
  NORAD_CAT_ID: number | string;
  EPOCH?: string;
  TLE_LINE1?: string;
  TLE_LINE2?: string;
  MEAN_MOTION?: number | string;
  ECCENTRICITY?: number | string;
  INCLINATION?: number | string;
  RA_OF_ASC_NODE?: number | string;
  ARG_OF_PERICENTER?: number | string;
  MEAN_ANOMALY?: number | string;
  BSTAR?: number | string;
  MEAN_MOTION_DOT?: number | string;
  MEAN_MOTION_DDOT?: number | string;
  ELEMENT_SET_NO?: number | string;
  REV_AT_EPOCH?: number | string;
  EPHEMERIS_TYPE?: number | string;
  CLASSIFICATION_TYPE?: string;
};

export type GeodeticPosition = {
  latitude: number;
  longitude: number;
  altitudeKm: number;
};

export function noradId(omm: OmmRecord): string {
  return String(omm.NORAD_CAT_ID);
}

export function satelliteContactId(omm: OmmRecord): string {
  return `sat:${noradId(omm)}`;
}

function asOmmJson(omm: OmmRecord): OMMJsonObject {
  return {
    OBJECT_NAME: omm.OBJECT_NAME,
    OBJECT_ID: omm.OBJECT_ID ?? String(omm.NORAD_CAT_ID),
    NORAD_CAT_ID: omm.NORAD_CAT_ID,
    EPOCH: omm.EPOCH ?? "",
    MEAN_MOTION: omm.MEAN_MOTION ?? 0,
    ECCENTRICITY: omm.ECCENTRICITY ?? 0,
    INCLINATION: omm.INCLINATION ?? 0,
    RA_OF_ASC_NODE: omm.RA_OF_ASC_NODE ?? 0,
    ARG_OF_PERICENTER: omm.ARG_OF_PERICENTER ?? 0,
    MEAN_ANOMALY: omm.MEAN_ANOMALY ?? 0,
    BSTAR: omm.BSTAR ?? 0,
    MEAN_MOTION_DOT: omm.MEAN_MOTION_DOT ?? 0,
    MEAN_MOTION_DDOT: omm.MEAN_MOTION_DDOT ?? 0,
    ELEMENT_SET_NO: omm.ELEMENT_SET_NO ?? 0,
    REV_AT_EPOCH: omm.REV_AT_EPOCH,
    EPHEMERIS_TYPE: 0,
    CLASSIFICATION_TYPE: "U",
  };
}

function eciToGeodeticAt(
  positionEci: { x: number; y: number; z: number },
  when: Date,
): GeodeticPosition | null {
  const gmst = gstime(when);
  const geo = eciToGeodetic(positionEci, gmst);
  const latitude = degreesLat(geo.latitude);
  const longitude = degreesLong(geo.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return {
    latitude,
    longitude,
    altitudeKm: Number.isFinite(geo.height) ? geo.height : 0,
  };
}

/** Propagate stored satellite elements: live TLE lines, else GP/OMM. */
export function geodeticFromSatRecord(
  record: OmmRecord,
  epochMs: number,
): GeodeticPosition | null {
  if (record.TLE_LINE1 && record.TLE_LINE2) {
    return geodeticFromTle(record.TLE_LINE1, record.TLE_LINE2, epochMs);
  }
  return geodeticFromOmm(record, epochMs);
}

/** Propagate CelesTrak GP/OMM elements with SGP4 to `epochMs`. */
export function geodeticFromOmm(
  omm: OmmRecord,
  epochMs: number,
): GeodeticPosition | null {
  if (!omm.EPOCH || omm.MEAN_MOTION == null) return null;
  if (!Number.isFinite(epochMs)) return null;
  try {
    const satrec = json2satrec(asOmmJson(omm));
    const when = new Date(epochMs);
    const pv = propagate(satrec, when);
    if (!pv || !pv.position) return null;
    return eciToGeodeticAt(pv.position, when);
  } catch {
    return null;
  }
}

/** Propagate a classic two-line element set with SGP4 to `epochMs`. */
export function geodeticFromTle(
  line1: string,
  line2: string,
  epochMs: number,
): GeodeticPosition | null {
  if (!Number.isFinite(epochMs)) return null;
  try {
    const satrec = twoline2satrec(line1.trim(), line2.trim());
    const when = new Date(epochMs);
    const pv = propagate(satrec, when);
    if (!pv || !pv.position) return null;
    return eciToGeodeticAt(pv.position, when);
  } catch {
    return null;
  }
}

export function slimOmm(raw: Record<string, unknown>): OmmRecord | null {
  const name = raw.OBJECT_NAME;
  const norad = raw.NORAD_CAT_ID;
  const epoch = raw.EPOCH;
  if (typeof name !== "string" || !name.trim()) return null;
  if (norad === undefined || norad === null || String(norad).trim() === "") {
    return null;
  }
  if (typeof epoch !== "string" || !epoch.trim()) return null;
  const numFields = [
    "MEAN_MOTION",
    "ECCENTRICITY",
    "INCLINATION",
    "RA_OF_ASC_NODE",
    "ARG_OF_PERICENTER",
    "MEAN_ANOMALY",
    "BSTAR",
    "MEAN_MOTION_DOT",
    "MEAN_MOTION_DDOT",
  ] as const;
  for (const f of numFields) {
    const v = raw[f];
    if (v === undefined || v === null || v === "") return null;
    if (typeof v !== "number" && typeof v !== "string") return null;
  }
  return {
    OBJECT_NAME: name.trim(),
    OBJECT_ID: typeof raw.OBJECT_ID === "string" ? raw.OBJECT_ID : undefined,
    NORAD_CAT_ID: norad as number | string,
    EPOCH: epoch,
    MEAN_MOTION: raw.MEAN_MOTION as number | string,
    ECCENTRICITY: raw.ECCENTRICITY as number | string,
    INCLINATION: raw.INCLINATION as number | string,
    RA_OF_ASC_NODE: raw.RA_OF_ASC_NODE as number | string,
    ARG_OF_PERICENTER: raw.ARG_OF_PERICENTER as number | string,
    MEAN_ANOMALY: raw.MEAN_ANOMALY as number | string,
    BSTAR: raw.BSTAR as number | string,
    MEAN_MOTION_DOT: raw.MEAN_MOTION_DOT as number | string,
    MEAN_MOTION_DDOT: raw.MEAN_MOTION_DDOT as number | string,
    ELEMENT_SET_NO: raw.ELEMENT_SET_NO as number | string | undefined,
    REV_AT_EPOCH: raw.REV_AT_EPOCH as number | string | undefined,
    EPHEMERIS_TYPE: raw.EPHEMERIS_TYPE as number | string | undefined,
    CLASSIFICATION_TYPE:
      typeof raw.CLASSIFICATION_TYPE === "string"
        ? raw.CLASSIFICATION_TYPE
        : undefined,
  };
}
