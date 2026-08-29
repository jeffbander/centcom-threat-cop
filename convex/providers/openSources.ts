/**
 * Open-source public feeds only.
 * Not classified intelligence. No live military asset tracking.
 * Short summaries + outbound links; no full-article storage.
 */

import type { ProviderRecord } from "../lib/normalize";
import { geocodeFromText, regionFromLatLon } from "../lib/geo";

const FETCH_TIMEOUT_MS = 12_000;
const MAX_BODY_BYTES = 2_500_000;
const USER_AGENT = "GlobalSituationMonitor/1.0 (MSWlab.ai prototype; open-source ingest)";

export async function fetchText(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json, application/geo+json, application/xml, text/xml, */*",
      },
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} for ${url}`);
    }
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_BODY_BYTES) {
      throw new Error(`Response too large (${buf.byteLength})`);
    }
    return new TextDecoder().decode(buf);
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchJson<T>(url: string): Promise<T> {
  const text = await fetchText(url);
  return JSON.parse(text) as T;
}

export function clip(s: string, n: number): string {
  return s.replace(/\s+/g, " ").trim().slice(0, n);
}

export function simpleHash(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

export function httpsOnly(url: string | undefined | null): string | null {
  if (!url || typeof url !== "string") return null;
  try {
    const u = new URL(url);
    return u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

// ——— USGS significant + strong quakes ———
type UsgsFeature = {
  id: string;
  properties: {
    mag: number | null;
    place: string | null;
    time: number;
    updated: number;
    url: string;
    title: string;
    tsunami?: number;
    sig?: number;
  };
  geometry: { coordinates: [number, number, number?] };
};

export async function fetchUsgsEvents(now = Date.now()): Promise<ProviderRecord[]> {
  const url =
    "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson";
  const data = await fetchJson<{ features: UsgsFeature[] }>(url);
  const out: ProviderRecord[] = [];
  const sorted = [...(data.features ?? [])].sort(
    (a, b) => (b.properties.mag ?? 0) - (a.properties.mag ?? 0),
  );
  for (const f of sorted.slice(0, 40)) {
    const mag = f.properties.mag ?? 0;
    const [lon, lat] = f.geometry.coordinates;
    const link = httpsOnly(f.properties.url);
    if (!link || !Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const severity =
      mag >= 7 || f.properties.tsunami
        ? "critical"
        : mag >= 6
          ? "high"
          : mag >= 5
            ? "moderate"
            : "informational";
    out.push({
      externalId: `usgs-${f.id}`,
      headline: clip(f.properties.title || `M${mag} earthquake`, 500),
      summary: clip(
        `USGS open seismic report: magnitude ${mag.toFixed(1)} near ${f.properties.place ?? "unknown location"}. Public scientific data — not a military assessment.`,
        2000,
      ),
      category: "weather",
      severity,
      confidence: "high",
      countryCode: "XX",
      region: regionFromLatLon(lat, lon),
      latitude: lat,
      longitude: lon,
      occurredAt: f.properties.time,
      firstObservedAt: f.properties.time,
      isSynthetic: false,
      generatedContentDisclosure:
        "Normalized from USGS public GeoJSON. System-generated operational summary — not a verified intelligence judgment.",
      whyItMatters:
        mag >= 6
          ? "Strong seismic event can disrupt infrastructure, logistics, and regional readiness."
          : "Seismic activity monitored for infrastructure and emergency-planning awareness.",
      sources: [
        {
          publisher: "USGS",
          sourceUrl: link,
          publishedAt: f.properties.updated || f.properties.time,
          title: clip(f.properties.title || "USGS event", 500),
          verificationStatus: "official",
        },
      ],
    });
  }
  return out.map((r) => ({ ...r, occurredAt: r.occurredAt || now }));
}

// ——— GDACS Orange/Red multi-hazard ———
type GdacsFeature = {
  geometry: { coordinates: [number, number] };
  properties: {
    eventtype?: string;
    eventid?: string | number;
    episodeid?: string | number;
    eventid_str?: string;
    name?: string;
    description?: string;
    htmldescription?: string;
    alertlevel?: string;
    fromdate?: string;
    todate?: string;
    iso3?: string;
    country?: string;
    url?: { report?: string; geometry?: string };
    severitydata?: { severity?: number; severitytext?: string };
  };
};

const GDACS_CATEGORY: Record<string, ProviderRecord["category"]> = {
  EQ: "weather",
  TC: "weather",
  FL: "weather",
  VO: "weather",
  WF: "weather",
  DR: "public_health",
  TS: "weather",
};

export async function fetchGdacsEvents(now = Date.now()): Promise<ProviderRecord[]> {
  const to = new Date(now);
  const from = new Date(now - 14 * 24 * 60 * 60 * 1000);
  const fromDate = from.toISOString().slice(0, 10);
  const toDate = to.toISOString().slice(0, 10);
  const url = `https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?fromDate=${fromDate}&toDate=${toDate}&alertlevel=Orange;Red`;
  const data = await fetchJson<{ features: GdacsFeature[] }>(url);
  const out: ProviderRecord[] = [];
  for (const f of data.features ?? []) {
    const p = f.properties;
    const [lon, lat] = f.geometry?.coordinates ?? [];
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const type = (p.eventtype ?? "HZ").toUpperCase();
    const id = String(p.eventid ?? p.eventid_str ?? `${type}-${lat}-${lon}`);
    const alert = (p.alertlevel ?? "Orange").toLowerCase();
    const severity =
      alert === "red" ? "critical" : alert === "orange" ? "high" : "moderate";
    const name = clip(p.name || p.description || p.htmldescription || `${type} event`, 500);
    const report =
      httpsOnly(p.url?.report) ||
      `https://www.gdacs.org/report.aspx?eventtype=${encodeURIComponent(type)}&eventid=${encodeURIComponent(id)}`;
    const when = p.fromdate ? Date.parse(p.fromdate) : now;
    out.push({
      externalId: `gdacs-${type}-${id}`,
      headline: clip(`GDACS ${p.alertlevel ?? ""}: ${name}`.replace(/\s+/g, " "), 500),
      summary: clip(
        `Global Disaster Alert and Coordination System (${p.alertlevel ?? "alert"}) for ${name} (${type}). Public multi-hazard coordination data — not a military threat assessment.`,
        2000,
      ),
      category: GDACS_CATEGORY[type] ?? "infrastructure",
      severity,
      confidence: "high",
      countryCode: clip((p.iso3 || "XX").toUpperCase(), 8),
      region: regionFromLatLon(lat, lon),
      latitude: lat,
      longitude: lon,
      occurredAt: Number.isFinite(when) ? when : now,
      isSynthetic: false,
      generatedContentDisclosure:
        "Normalized from GDACS public API. System-generated summary for situational awareness.",
      whyItMatters:
        "Multi-hazard alerts inform logistics risk, force protection environment, and humanitarian load.",
      sources: [
        {
          publisher: "GDACS",
          sourceUrl: report.startsWith("https:")
            ? report
            : "https://www.gdacs.org/",
          publishedAt: Number.isFinite(when) ? when : now,
          title: name,
          verificationStatus: "official",
        },
      ],
    });
  }
  return out.slice(0, 40);
}

// ——— NASA EONET natural events ———
type EonetEvent = {
  id: string;
  title: string;
  description?: string | null;
  link?: string;
  categories: Array<{ id: string; title: string }>;
  geometry: Array<{
    date: string;
    type: string;
    coordinates: number[] | number[][];
  }>;
  sources?: Array<{ id: string; url: string }>;
};

export async function fetchEonetEvents(now = Date.now()): Promise<ProviderRecord[]> {
  const url = "https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=50";
  const data = await fetchJson<{ events: EonetEvent[] }>(url);
  const out: ProviderRecord[] = [];
  for (const e of data.events ?? []) {
    const g = e.geometry?.[e.geometry.length - 1];
    if (!g) continue;
    let lon: number | undefined;
    let lat: number | undefined;
    if (Array.isArray(g.coordinates) && typeof g.coordinates[0] === "number") {
      lon = g.coordinates[0] as number;
      lat = g.coordinates[1] as number;
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const catTitle = e.categories?.[0]?.title ?? "Natural event";
    const catLower = catTitle.toLowerCase();
    const category: ProviderRecord["category"] =
      catLower.includes("storm") || catLower.includes("flood") || catLower.includes("fire")
        ? "weather"
        : catLower.includes("volcano")
          ? "weather"
          : "infrastructure";
    const severity =
      catLower.includes("hurricane") || catLower.includes("cyclone")
        ? "critical"
        : catLower.includes("wildfire") || catLower.includes("severe")
          ? "high"
          : "moderate";
    const when = Date.parse(g.date);
    const primary =
      httpsOnly(e.sources?.[0]?.url) ||
      httpsOnly(e.link) ||
      "https://eonet.gsfc.nasa.gov/";
    out.push({
      externalId: `eonet-${e.id}`,
      headline: clip(e.title, 500),
      summary: clip(
        e.description ||
          `NASA EONET open natural event (${catTitle}). Public Earth observation catalog — not a military product.`,
        2000,
      ),
      category,
      severity,
      confidence: "high",
      countryCode: "XX",
      region: regionFromLatLon(lat!, lon!),
      latitude: lat!,
      longitude: lon!,
      occurredAt: Number.isFinite(when) ? when : now,
      isSynthetic: false,
      generatedContentDisclosure:
        "Normalized from NASA EONET public API. System-generated summary.",
      whyItMatters:
        "Natural hazards shape basing, mobility corridors, and humanitarian demand.",
      sources: [
        {
          publisher: e.sources?.[0]?.id || "NASA EONET",
          sourceUrl: primary,
          publishedAt: Number.isFinite(when) ? when : now,
          title: clip(e.title, 500),
          verificationStatus: "official",
        },
      ],
    });
  }
  return out;
}

// ——— UN Peace & Security RSS (geopolitical) ———
export function parseRssItems(xml: string): Array<{
  title: string;
  link: string;
  description: string;
  pubDate?: string;
}> {
  const items: Array<{
    title: string;
    link: string;
    description: string;
    pubDate?: string;
  }> = [];
  const rssChunks = xml.split(/<item[\s>]/i).slice(1);
  const atomChunks = xml.split(/<entry[\s>]/i).slice(1);
  const chunks = (rssChunks.length ? rssChunks : atomChunks).slice(0, 30);
  for (const chunk of chunks) {
    const title = (chunk.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/i) ||
      chunk.match(/<title[^>]*>([\s\S]*?)<\/title>/i))?.[1];
    const link =
      (chunk.match(/<link><!\[CDATA\[(.*?)\]\]><\/link>/i) ||
        chunk.match(/<link>(.*?)<\/link>/i))?.[1] ||
      chunk.match(/<link[^>]+href=["']([^"']+)["']/i)?.[1];
    const description = (chunk.match(
      /<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/i,
    ) ||
      chunk.match(/<description>([\s\S]*?)<\/description>/i) ||
      chunk.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i) ||
      chunk.match(/<content[^>]*>([\s\S]*?)<\/content>/i))?.[1];
    const pubDate = (chunk.match(/<pubDate>(.*?)<\/pubDate>/i) ||
      chunk.match(/<dc:date>(.*?)<\/dc:date>/i) ||
      chunk.match(/<updated>(.*?)<\/updated>/i) ||
      chunk.match(/<published>(.*?)<\/published>/i))?.[1];
    if (!title || !link) continue;
    const cleanLink = httpsOnly(link.trim());
    if (!cleanLink) continue;
    items.push({
      title: clip(title.replace(/<[^>]+>/g, ""), 500),
      link: cleanLink,
      description: clip(
        (description ?? "").replace(/<[^>]+>/g, " "),
        2000,
      ),
      pubDate,
    });
  }
  return items;
}

export function threatSeverityFromText(text: string): ProviderRecord["severity"] {
  if (/\b(war|invasion|missile|airstrike|nuclear|mass.?casualt|genocide|offensive)\b/i.test(text))
    return "critical";
  if (/\b(conflict|attack|strike|combat|troop|military|ceasefire.?collapse|sanction)\b/i.test(text))
    return "high";
  if (/\b(tension|dispute|warning|deploy|exercise|peacekeeping)\b/i.test(text))
    return "moderate";
  return "informational";
}

export async function fetchUnPeaceSecurity(now = Date.now()): Promise<ProviderRecord[]> {
  const url =
    "https://news.un.org/feed/subscribe/en/news/topic/peace-and-security/feed/rss.xml";
  const xml = await fetchText(url);
  const items = parseRssItems(xml);
  const out: ProviderRecord[] = [];
  for (const item of items) {
    const geo =
      geocodeFromText(`${item.title} ${item.description}`) ?? {
        latitude: 40.75,
        longitude: -73.97,
        countryCode: "UN",
        region: "Global" as const,
      };
    const when = item.pubDate ? Date.parse(item.pubDate) : now;
    const severity = threatSeverityFromText(`${item.title} ${item.description}`);
    out.push({
      externalId: `unps-${simpleHash(item.link)}`,
      headline: clip(item.title, 500),
      summary: clip(
        item.description ||
          "United Nations public peace and security reporting. Open-source diplomatic signal — not classified intelligence.",
        2000,
      ),
      category: "geopolitical",
      severity,
      confidence: "medium",
      countryCode: geo.countryCode,
      region: geo.region,
      latitude: geo.latitude,
      longitude: geo.longitude,
      occurredAt: Number.isFinite(when) ? when : now,
      isSynthetic: false,
      generatedContentDisclosure:
        "Normalized from UN News public RSS. Location may be approximate from place-name inference. Not a military intelligence product.",
      whyItMatters:
        "UN peace/security reporting is a primary open-source indicator of escalating or de-escalating theaters.",
      sources: [
        {
          publisher: "UN News",
          sourceUrl: item.link,
          publishedAt: Number.isFinite(when) ? when : now,
          title: clip(item.title, 500),
          verificationStatus: "official",
        },
      ],
    });
  }
  return out;
}

/**
 * Strategic threat theaters — open-source baseline anchors for major
 * publicly reported security situations. Coordinates are approximate
 * theater centroids. Not live force tracking; not classified.
 */
export function strategicTheaterBaselines(now = Date.now()): ProviderRecord[] {
  const day = 24 * 60 * 60 * 1000;
  const theaters: Array<
    Omit<ProviderRecord, "sources" | "isSynthetic" | "generatedContentDisclosure"> & {
      sourceUrl: string;
      publisher: string;
    }
  > = [
    {
      externalId: "theater-ukraine",
      headline: "THEATER: Eastern Europe — Russia–Ukraine war continuum",
      summary:
        "Open-source baseline: active high-intensity interstate war with ongoing attrition, air/missile campaigns, and extended regional spillover risk. Public reporting only — not a targeting product.",
      category: "geopolitical",
      severity: "critical",
      confidence: "high",
      countryCode: "UA",
      region: "Europe",
      latitude: 48.4,
      longitude: 31.2,
      occurredAt: now - 2 * day,
      whyItMatters:
        "Primary conventional war theater shaping NATO posture, munitions demand, and energy security.",
      sourceUrl: "https://news.un.org/en/news/topic/peace-and-security",
      publisher: "UN Peace & Security topic",
    },
    {
      externalId: "theater-gaza-levant",
      headline: "THEATER: Levant — Israel–Gaza / regional spillover",
      summary:
        "Open-source baseline: high-intensity conflict with multi-front regional risk (Gaza, Lebanon axis, Red Sea adjacency). Humanitarian and escalation watch. Public sources only.",
      category: "geopolitical",
      severity: "critical",
      confidence: "high",
      countryCode: "PS",
      region: "Middle East",
      latitude: 31.5,
      longitude: 34.47,
      occurredAt: now - 1 * day,
      whyItMatters:
        "Dense urban combat + regional proxy risk drives diplomatic crisis bandwidth and force protection alerts.",
      sourceUrl: "https://news.un.org/en/news/topic/middle-east",
      publisher: "UN News Middle East",
    },
    {
      externalId: "theater-red-sea",
      headline: "THEATER: Red Sea / Bab el-Mandeb — maritime threat corridor",
      summary:
        "Open-source baseline: persistent anti-shipping threat environment affecting global logistics and energy routes. Not live vessel tracking.",
      category: "transportation",
      severity: "high",
      confidence: "medium",
      countryCode: "YE",
      region: "Middle East",
      latitude: 12.5,
      longitude: 43.4,
      occurredAt: now - 3 * day,
      whyItMatters:
        "Chokepoint disruption cascades into global supply-chain and energy risk.",
      sourceUrl: "https://www.imo.org/",
      publisher: "IMO (public maritime safety)",
    },
    {
      externalId: "theater-taiwan-strait",
      headline: "THEATER: Taiwan Strait — great-power contingency watch",
      summary:
        "Open-source baseline: elevated military activity and coercive pressure risk around the Taiwan Strait. Monitoring posture only — no predictive claim.",
      category: "geopolitical",
      severity: "high",
      confidence: "medium",
      countryCode: "TW",
      region: "Asia",
      latitude: 24.5,
      longitude: 119.5,
      occurredAt: now - 4 * day,
      whyItMatters:
        "Highest-impact potential Indo-Pacific contingency for allied readiness and semiconductor logistics.",
      sourceUrl: "https://news.un.org/en/news/topic/peace-and-security",
      publisher: "UN Peace & Security topic",
    },
    {
      externalId: "theater-korean-peninsula",
      headline: "THEATER: Korean Peninsula — DPRK missile/nuclear watch",
      summary:
        "Open-source baseline: DPRK strategic weapons programs and periodic launch activity. Open-source monitoring only.",
      category: "geopolitical",
      severity: "high",
      confidence: "medium",
      countryCode: "KP",
      region: "Asia",
      latitude: 39.0,
      longitude: 125.7,
      occurredAt: now - 5 * day,
      whyItMatters:
        "Nuclear-armed theater with rapid escalation pathways and alliance trigger risk.",
      sourceUrl: "https://news.un.org/en/news/topic/peace-and-security",
      publisher: "UN Peace & Security topic",
    },
    {
      externalId: "theater-sahel",
      headline: "THEATER: Central Sahel — jihadist insurgency belt",
      summary:
        "Open-source baseline: sustained non-state armed group activity across Mali–Burkina Faso–Niger corridor with governance collapse risk.",
      category: "geopolitical",
      severity: "high",
      confidence: "medium",
      countryCode: "BF",
      region: "Africa",
      latitude: 13.5,
      longitude: 2.1,
      occurredAt: now - 6 * day,
      whyItMatters:
        "Expanding irregular warfare zone with regional coup dynamics and partner force implications.",
      sourceUrl: "https://news.un.org/en/news/topic/africa",
      publisher: "UN News Africa",
    },
    {
      externalId: "theater-sudan",
      headline: "THEATER: Sudan — multi-faction civil war",
      summary:
        "Open-source baseline: large-scale civil conflict with mass displacement and urban combat. Severe humanitarian and regional spillover risk.",
      category: "geopolitical",
      severity: "critical",
      confidence: "high",
      countryCode: "SD",
      region: "Africa",
      latitude: 15.5,
      longitude: 32.5,
      occurredAt: now - 2.5 * day,
      whyItMatters:
        "One of the largest active displacement crises with Red Sea adjacency.",
      sourceUrl: "https://news.un.org/en/news/topic/africa",
      publisher: "UN News Africa",
    },
    {
      externalId: "theater-scs",
      headline: "THEATER: South China Sea — gray-zone maritime pressure",
      summary:
        "Open-source baseline: gray-zone maritime coercion, militia presence, and contested features. Not live ship tracks.",
      category: "geopolitical",
      severity: "moderate",
      confidence: "medium",
      countryCode: "PH",
      region: "Asia",
      latitude: 12.0,
      longitude: 115.0,
      occurredAt: now - 7 * day,
      whyItMatters:
        "Gray-zone friction risks miscalculation among major navies and coastal states.",
      sourceUrl: "https://news.un.org/en/news/topic/peace-and-security",
      publisher: "UN Peace & Security topic",
    },
    {
      externalId: "theater-hormuz",
      headline: "THEATER: Strait of Hormuz — energy chokepoint risk",
      summary:
        "Open-source baseline: critical energy transit corridor with periodic military signaling and mine/anti-access risk narratives in public reporting.",
      category: "energy",
      severity: "high",
      confidence: "medium",
      countryCode: "IR",
      region: "Middle East",
      latitude: 26.6,
      longitude: 56.25,
      occurredAt: now - 3.5 * day,
      whyItMatters:
        "Global oil price and alliance logistics sensitivity to any closure threat.",
      sourceUrl: "https://www.eia.gov/todayinenergy/",
      publisher: "U.S. EIA (public energy analysis)",
    },
    {
      externalId: "theater-cyber-critical",
      headline: "THEATER: Transnational cyber — critical infrastructure pressure",
      summary:
        "Open-source baseline: persistent ransomware and state-aligned cyber pressure against logistics, health, and energy operators worldwide. No specific target list.",
      category: "cybersecurity",
      severity: "high",
      confidence: "low",
      countryCode: "XX",
      region: "Global",
      latitude: 20.0,
      longitude: 0.0,
      occurredAt: now - 1.2 * day,
      whyItMatters:
        "Cyber is the continuous low-cost attack surface against dual-use infrastructure.",
      sourceUrl: "https://www.cisa.gov/news-events/cybersecurity-advisories",
      publisher: "CISA advisories (public)",
    },
  ];

  return theaters.map((t) => ({
    externalId: t.externalId,
    headline: t.headline,
    summary: t.summary,
    category: t.category,
    severity: t.severity,
    confidence: t.confidence,
    countryCode: t.countryCode,
    region: t.region,
    latitude: t.latitude,
    longitude: t.longitude,
    occurredAt: t.occurredAt,
    isSynthetic: false,
    generatedContentDisclosure:
      "Strategic theater baseline for open-source situational awareness. Approximate centroid. Not classified intelligence, not live military asset tracking, and not a prediction of future attacks.",
    whyItMatters: t.whyItMatters,
    sources: [
      {
        publisher: t.publisher,
        sourceUrl: t.sourceUrl.startsWith("https:")
          ? t.sourceUrl
          : "https://news.un.org/en/news/topic/peace-and-security",
        publishedAt: t.occurredAt,
        title: t.headline,
        verificationStatus: "corroborated" as const,
      },
    ],
  }));
}
