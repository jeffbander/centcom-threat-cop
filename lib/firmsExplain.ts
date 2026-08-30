import type { FirmsDetection } from "@/convex/lib/firms";
import { inMiddleEastAor, inUkraineAor } from "@/lib/theaters";
import { bearingDeg, haversineKm } from "@/lib/spatialJoin";
import { formatRelativeTime } from "@/lib/format";
import { GAZETTEER } from "@/lib/gazetteer";
import { OSINT_SITES } from "@/lib/osintOverlays";

const CLUSTER_KM = 15;

export type FirmsIntensity =
  | "extreme"
  | "very high"
  | "high"
  | "moderate"
  | "low";

export type FirmsContactView = {
  kind: "firms";
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  subtitle: string;
  details: Array<{ label: string; value: string }>;
  assessment: string;
  tooltip: string;
  provenance: string;
};

function intensity(frp: number): FirmsIntensity {
  if (frp >= 200) return "extreme";
  if (frp >= 80) return "very high";
  if (frp >= 30) return "high";
  if (frp >= 10) return "moderate";
  return "low";
}

function cardinal(deg: number): string {
  const labels = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
  ];
  return labels[Math.round(deg / 22.5) % 16];
}

function sensorName(satellite: string, instrument: string): string {
  const s = satellite.trim().toUpperCase();
  const sat =
    s === "N" || s === "N20" || s === "NOAA-20"
      ? "NOAA-20"
      : s === "1" || s === "NPP" || s === "SNPP" || s === "SUOMI NPP"
        ? "Suomi NPP"
        : s === "N21" || s === "21" || s === "NOAA-21"
          ? "NOAA-21"
          : s === "AQUA"
            ? "Aqua"
            : s === "TERRA"
              ? "Terra"
              : satellite.trim() || "unknown";
  const inst = instrument.trim() || "VIIRS";
  return `${sat} ${inst}`;
}

function dayNightLabel(daynight: string | null): string {
  const v = (daynight ?? "").toUpperCase();
  if (v === "N") return "night";
  if (v === "D") return "day";
  return "";
}

function theaterLabel(lat: number, lon: number): string | null {
  if (inUkraineAor(lat, lon)) return "Ukraine AOR";
  if (inMiddleEastAor(lat, lon)) return "Middle East AOR";
  return null;
}

function nearestCity(lat: number, lon: number, maxKm = 350) {
  const origin = { latitude: lat, longitude: lon };
  let best: { name: string; country: string; km: number; bearing: string } | null =
    null;
  for (const p of GAZETTEER) {
    const km = haversineKm(origin, p);
    if (km > maxKm) continue;
    if (!best || km < best.km) {
      best = {
        name: p.name,
        country: p.country,
        km,
        bearing: cardinal(bearingDeg(p, origin)),
      };
    }
  }
  return best;
}

function nearestSite(lat: number, lon: number, maxKm = 80) {
  const origin = { latitude: lat, longitude: lon };
  let best: { name: string; km: number; bearing: string; note: string } | null =
    null;
  for (const s of OSINT_SITES) {
    const km = haversineKm(origin, s);
    if (km > maxKm) continue;
    if (!best || km < best.km) {
      best = {
        name: s.name,
        km,
        bearing: cardinal(bearingDeg(s, origin)),
        note: s.note,
      };
    }
  }
  return best;
}

function clusterOf(d: FirmsDetection, all: FirmsDetection[]) {
  const others = all.filter((x) => {
    if (x.id === d.id) return false;
    return haversineKm(d, x) <= CLUSTER_KM;
  });
  const sum = others.reduce((acc, x) => acc + x.frp, 0) + d.frp;
  return { count: others.length + 1, sumFrp: sum };
}

function patternLine(lat: number, lon: number, frp: number, night: boolean) {
  const theater = theaterLabel(lat, lon);
  if (theater && frp >= 30) {
    return `Inside ${theater}. High FRP is heat, not battle-damage assessment — do not treat this pixel as a confirmed strike.`;
  }
  if (lat < 5 && lat > -20 && lon < -45 && lon > -75 && frp >= 10) {
    return "Amazon / cerrado fire belt. Often vegetation fire in dry season; still a heat pixel, not a cause.";
  }
  if (lat > 50 && lon > 60 && frp >= 10) {
    return "Boreal belt. Often wildfire or agricultural burn; heat only.";
  }
  if (night && frp >= 80) {
    return "Night detection at this FRP is a strong thermal anomaly (large fire, flare, or explosion heat).";
  }
  return "Satellite heat pixel only. Cause (wildfire, flare, industry, strike) is not identified by FIRMS.";
}

export function explainFirms(
  d: FirmsDetection,
  all: FirmsDetection[] = [],
  now = Date.now(),
  provenance = "NASA FIRMS — public heat, not targeting",
): FirmsContactView {
  const level = intensity(d.frp);
  const city = nearestCity(d.latitude, d.longitude);
  const site = nearestSite(d.latitude, d.longitude);
  const theater = theaterLabel(d.latitude, d.longitude);
  const sensor = sensorName(d.satellite, d.instrument);
  const when = dayNightLabel(d.daynight);
  const cluster = all.length ? clusterOf(d, all) : { count: 1, sumFrp: d.frp };
  const place = city
    ? `${city.km.toFixed(0)} km ${city.bearing} of ${city.name}`
    : `${d.latitude.toFixed(2)}°, ${d.longitude.toFixed(2)}°`;
  const title = `${d.frp.toFixed(0)} MW thermal · ${place}`;
  const bits = [
    theater,
    when,
    sensor,
    d.confidence ? `${d.confidence} confidence` : null,
  ].filter(Boolean);
  const subtitle = bits.join(" · ") || "FIRMS heat detection";
  const tooltip = `${d.frp.toFixed(0)} MW · ${place}${theater ? ` · ${theater}` : ""}`;

  const clusterLine =
    cluster.count > 1
      ? `${cluster.count} FIRMS pixels within ${CLUSTER_KM} km (combined ${cluster.sumFrp.toFixed(0)} MW) — a heat cluster, not one spark.`
      : "Isolated pixel in the loaded set. May be a flare, small fire, or a lone hot spot.";

  const siteLine = site
    ? `${site.km.toFixed(0)} km ${site.bearing} of ${site.name}.`
    : "";

  const assessment = [
    `${level[0].toUpperCase()}${level.slice(1)}-intensity FIRMS detection at ${d.frp.toFixed(1)} MW FRP, ${when || "timing unknown"} pass, ${sensor}.`,
    city
      ? `Nearest named place: ${city.km.toFixed(0)} km ${city.bearing} of ${city.name}, ${city.country}${theater ? ` (${theater})` : ""}.`
      : theater
        ? `Inside ${theater}; no gazetteer city within 350 km.`
        : "No gazetteer city within 350 km of this pixel.",
    siteLine,
    clusterLine,
    patternLine(d.latitude, d.longitude, d.frp, when === "night"),
    `Acquired ${formatRelativeTime(d.acquiredAt, now)}. This is not an article about the pixel — nearby news in the COP is only spatial coincidence unless the headline names this place.`,
  ]
    .filter(Boolean)
    .join(" ");

  const details: Array<{ label: string; value: string }> = [
    { label: "FRP", value: `${d.frp.toFixed(1)} MW (${level})` },
    { label: "Sensor", value: sensor },
    {
      label: "Acquired",
      value: `${new Date(d.acquiredAt).toISOString().slice(0, 16)}Z (${formatRelativeTime(d.acquiredAt, now)})`,
    },
    { label: "Confidence", value: d.confidence || "—" },
    { label: "Pass", value: when || "—" },
    {
      label: "Place",
      value: city
        ? `${city.km.toFixed(0)} km ${city.bearing} ${city.name}, ${city.country}`
        : "—",
    },
    ...(theater ? [{ label: "AOR", value: theater }] : []),
    ...(site
      ? [
          {
            label: "Landmark",
            value: `${site.km.toFixed(0)} km ${site.bearing} ${site.name}`,
          },
        ]
      : []),
    {
      label: "Cluster",
      value:
        cluster.count > 1
          ? `${cluster.count} px / ${cluster.sumFrp.toFixed(0)} MW`
          : "isolated",
    },
    {
      label: "Lat/Lon",
      value: `${d.latitude.toFixed(3)}, ${d.longitude.toFixed(3)}`,
    },
  ];

  return {
    kind: "firms",
    id: d.id,
    latitude: d.latitude,
    longitude: d.longitude,
    title,
    subtitle,
    details,
    assessment,
    tooltip,
    provenance,
  };
}
