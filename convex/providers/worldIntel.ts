/**
 * Additional open-source ingest (catalog inspired by world-intel-mcp).
 * Public APIs only. Not classified intelligence. Not live force tracking.
 */

import type { ProviderRecord } from "../lib/normalize";
import { geocodeFromText, regionFromLatLon } from "../lib/geo";
import {
  clip,
  fetchJson,
  fetchText,
  httpsOnly,
  parseRssItems,
  simpleHash,
  threatSeverityFromText,
} from "./openSources";

const CISA_KEV_URL =
  "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json";
const NGA_WARNINGS_URL =
  "https://msi.nga.mil/api/publications/broadcast-warn?output=json";

/** CISA reporting location — not the victim. */
export const CISA_REPORTING = {
  latitude: 38.879,
  longitude: -77.107,
  countryCode: "US",
  region: "North America" as const,
};

export const HIGH_CONCERN_PATHOGENS = [
  "ebola",
  "marburg",
  "mpox",
  "h5n1",
  "avian influenza",
  "bird flu",
  "nipah",
  "mers",
  "sars",
  "cholera",
  "plague",
  "anthrax",
  "polio",
  "yellow fever",
  "hantavirus",
  "lassa",
  "rift valley",
  "dengue",
  "zika",
  "chikungunya",
] as const;

const HEALTH_FEEDS: Array<{ publisher: string; url: string }> = [
  { publisher: "WHO", url: "https://www.who.int/rss-feeds/news-english.xml" },
  {
    publisher: "CDC",
    url: "https://tools.cdc.gov/api/v2/resources/media/132608.rss",
  },
  { publisher: "Outbreak News Today", url: "https://outbreaknewstoday.com/feed/" },
];

const NEWS_FEEDS: Array<{ publisher: string; url: string }> = [
  { publisher: "BBC World", url: "https://feeds.bbci.co.uk/news/world/rss.xml" },
  { publisher: "The Guardian World", url: "https://www.theguardian.com/world/rss" },
  { publisher: "Al Jazeera", url: "https://www.aljazeera.com/xml/rss/all.xml" },
  { publisher: "USNI News", url: "https://news.usni.org/feed" },
  { publisher: "ReliefWeb", url: "https://reliefweb.int/updates/rss.xml" },
  { publisher: "International Crisis Group", url: "https://www.crisisgroup.org/rss.xml" },
  { publisher: "The Diplomat", url: "https://thediplomat.com/feed/" },
];

const NAVAREA_CENTROID: Record<string, { lat: number; lon: number; region: string; countryCode: string }> =
  {
    I: { lat: 55, lon: 0, region: "Europe", countryCode: "GB" },
    II: { lat: 20, lon: -15, region: "Africa", countryCode: "FR" },
    III: { lat: 38, lon: 15, region: "Europe", countryCode: "ES" },
    IV: { lat: 30, lon: -70, region: "North America", countryCode: "US" },
    V: { lat: -15, lon: -35, region: "South America", countryCode: "BR" },
    VI: { lat: -40, lon: -50, region: "South America", countryCode: "AR" },
    VII: { lat: -30, lon: 30, region: "Africa", countryCode: "ZA" },
    VIII: { lat: 10, lon: 75, region: "Asia", countryCode: "IN" },
    IX: { lat: 22, lon: 60, region: "Middle East", countryCode: "PK" },
    X: { lat: -25, lon: 115, region: "Oceania", countryCode: "AU" },
    XI: { lat: 30, lon: 135, region: "Asia", countryCode: "JP" },
    XII: { lat: 30, lon: -140, region: "North America", countryCode: "US" },
    XIII: { lat: 75, lon: 50, region: "Europe", countryCode: "RU" },
    XIV: { lat: -40, lon: 170, region: "Oceania", countryCode: "NZ" },
    XV: { lat: -35, lon: -80, region: "South America", countryCode: "CL" },
    XVI: { lat: -10, lon: -80, region: "South America", countryCode: "PE" },
  };

export type CisaVulnerability = {
  cveID?: string;
  vendorProject?: string;
  product?: string;
  vulnerabilityName?: string;
  dateAdded?: string;
  shortDescription?: string;
  knownRansomwareCampaignUse?: string;
  notes?: string;
};

const NGA_COORD_RE =
  /(\d{1,3})-(\d{1,2}(?:\.\d+)?)\s*([NS])\s+(\d{1,3})-(\d{1,2}(?:\.\d+)?)\s*([EW])/i;

export function parseNgaCoords(
  text: string,
): { latitude: number; longitude: number } | null {
  const m = NGA_COORD_RE.exec(text);
  if (!m) return null;
  let lat = Number(m[1]) + Number(m[2]) / 60;
  if (m[3].toUpperCase() === "S") lat = -lat;
  let lon = Number(m[4]) + Number(m[5]) / 60;
  if (m[6].toUpperCase() === "W") lon = -lon;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return { latitude: lat, longitude: lon };
}

export function mentionedPathogens(text: string): string[] {
  const lower = text.toLowerCase();
  return HIGH_CONCERN_PATHOGENS.filter((p) => lower.includes(p));
}

export function mapCisaVulnerability(
  vuln: CisaVulnerability,
  now: number,
  cutoffMs: number,
): ProviderRecord | null {
  const cve = (vuln.cveID ?? "").trim();
  if (!cve) return null;
  const added = vuln.dateAdded ? Date.parse(`${vuln.dateAdded}T00:00:00Z`) : NaN;
  const occurredAt = Number.isFinite(added) ? added : now;
  if (occurredAt < cutoffMs) return null;

  const ransomware = (vuln.knownRansomwareCampaignUse ?? "").toLowerCase() === "known";
  const vendor = clip(vuln.vendorProject || "Unknown vendor", 80);
  const product = clip(vuln.product || "unspecified product", 80);
  const name = clip(vuln.vulnerabilityName || cve, 240);
  const desc = clip(
    vuln.shortDescription ||
      `CISA Known Exploited Vulnerability ${cve} affecting ${vendor} ${product}.`,
    2000,
  );
  const sourceUrl =
    httpsOnly(`https://nvd.nist.gov/vuln/detail/${encodeURIComponent(cve)}`) ??
    "https://www.cisa.gov/known-exploited-vulnerabilities-catalog";

  return {
    externalId: `cisa-kev-${cve.toLowerCase()}`,
    headline: clip(`CISA KEV: ${cve} — ${name}`, 500),
    summary: clip(
      `${desc} Official CISA catalog entry. Map pin is CISA reporting location, not a victim site. Not a military cyber assessment.`,
      2000,
    ),
    category: "cybersecurity",
    severity: ransomware ? "critical" : "high",
    confidence: "high",
    countryCode: CISA_REPORTING.countryCode,
    region: CISA_REPORTING.region,
    latitude: CISA_REPORTING.latitude,
    longitude: CISA_REPORTING.longitude,
    occurredAt,
    isSynthetic: false,
    generatedContentDisclosure:
      "Normalized from CISA Known Exploited Vulnerabilities catalog. Location is the reporting authority, not the affected system.",
    whyItMatters: ransomware
      ? "Actively exploited CVE with known ransomware use — patch and hunting priority."
      : "CISA-listed exploited vulnerability — public cyber readiness signal.",
    sources: [
      {
        publisher: "CISA",
        sourceUrl,
        publishedAt: occurredAt,
        title: clip(`${cve} ${name}`, 500),
        verificationStatus: "official",
      },
    ],
  };
}

export function mapHealthRssItem(
  item: { title: string; link: string; description: string; pubDate?: string },
  publisher: string,
  now: number,
): ProviderRecord | null {
  const text = `${item.title} ${item.description}`;
  const pathogens = mentionedPathogens(text);
  const isWho = publisher === "WHO";
  if (!pathogens.length && !isWho) return null;

  const geo = geocodeFromText(text) ?? {
    latitude: 46.23,
    longitude: 6.14,
    countryCode: "CH",
    region: "Europe" as const,
  };
  const when = item.pubDate ? Date.parse(item.pubDate) : now;
  const occurredAt = Number.isFinite(when) ? when : now;
  const severity: ProviderRecord["severity"] =
    pathogens.some((p) =>
      ["ebola", "marburg", "h5n1", "nipah", "plague", "anthrax"].includes(p),
    )
      ? "critical"
      : pathogens.length
        ? "high"
        : "moderate";

  return {
    externalId: `health-${simpleHash(item.link)}`,
    headline: clip(item.title, 500),
    summary: clip(
      item.description ||
        `Public-health reporting from ${publisher}. Open-source disease monitoring — not clinical decision support.`,
      2000,
    ),
    category: "public_health",
    severity,
    confidence: isWho ? "high" : "medium",
    countryCode: geo.countryCode,
    region: geo.region,
    latitude: geo.latitude,
    longitude: geo.longitude,
    occurredAt,
    isSynthetic: false,
    generatedContentDisclosure:
      "Normalized from public health RSS. Location may be inferred from place names. Not a verified outbreak confirmation.",
    whyItMatters: pathogens.length
      ? `Mentions ${pathogens.slice(0, 3).join(", ")} — watch for regional health-security load.`
      : "WHO public-health reporting for situational awareness.",
    sources: [
      {
        publisher,
        sourceUrl: item.link,
        publishedAt: occurredAt,
        title: clip(item.title, 500),
        verificationStatus: isWho ? "official" : "unverified",
      },
    ],
  };
}

export function mapNewsRssItem(
  item: { title: string; link: string; description: string; pubDate?: string },
  publisher: string,
  now: number,
): ProviderRecord | null {
  const text = `${item.title} ${item.description}`;
  const geo = geocodeFromText(text);
  if (!geo) return null;
  const when = item.pubDate ? Date.parse(item.pubDate) : now;
  const occurredAt = Number.isFinite(when) ? when : now;
  const severity = threatSeverityFromText(text);

  return {
    externalId: `osint-news-${simpleHash(item.link)}`,
    headline: clip(item.title, 500),
    summary: clip(
      item.description ||
        `Open-source news from ${publisher}. Public reporting — not a verified intelligence judgment.`,
      2000,
    ),
    category: "geopolitical",
    severity,
    confidence: "medium",
    countryCode: geo.countryCode,
    region: geo.region,
    latitude: geo.latitude,
    longitude: geo.longitude,
    occurredAt,
    isSynthetic: false,
    generatedContentDisclosure:
      "Normalized from public RSS. Location inferred from place names. Not classified reporting.",
    whyItMatters:
      "Tier-1 open-source reporting used to fill the geopolitical picture alongside UN and theater baselines.",
    sources: [
      {
        publisher,
        sourceUrl: item.link,
        publishedAt: occurredAt,
        title: clip(item.title, 500),
        verificationStatus: "unverified",
      },
    ],
  };
}

export type NgaWarningRaw = {
  msgYear?: string | number;
  msgNumber?: string | number;
  navArea?: string;
  cancelDate?: string | null;
  issueDate?: string;
  text?: string;
  authority?: string;
};

export function mapNgaWarning(
  warning: NgaWarningRaw,
  now: number,
): ProviderRecord | null {
  const cancel = warning.cancelDate;
  if (cancel != null && String(cancel).trim() !== "") return null;
  const text = clip(warning.text || "", 2000);
  if (!text) return null;
  const coords = parseNgaCoords(text);
  const nav = String(warning.navArea ?? "").toUpperCase();
  const centroid = NAVAREA_CENTROID[nav];
  const latitude = coords?.latitude ?? centroid?.lat;
  const longitude = coords?.longitude ?? centroid?.lon;
  if (latitude == null || longitude == null) return null;

  const idYear = String(warning.msgYear ?? "na");
  const idNum = String(warning.msgNumber ?? simpleHash(text));
  const when = warning.issueDate ? Date.parse(warning.issueDate) : now;
  const occurredAt = Number.isFinite(when) ? when : now;
  const severe = /\b(mine|missile|hostile|attack|warship|gunfire|piracy|unexploded)\b/i.test(
    text,
  );

  return {
    externalId: `nga-${idYear}-${idNum}-${nav || "x"}`,
    headline: clip(
      `NGA NAVAREA ${nav || "?"}: ${text.replace(/\s+/g, " ").slice(0, 160)}`,
      500,
    ),
    summary: clip(
      `${text} Public NGA Maritime Safety Information — not a naval targeting product.`,
      2000,
    ),
    category: "transportation",
    severity: severe ? "high" : "moderate",
    confidence: coords ? "high" : "medium",
    countryCode: centroid?.countryCode ?? "XX",
    region: centroid?.region ?? regionFromLatLon(latitude, longitude),
    latitude,
    longitude,
    occurredAt,
    isSynthetic: false,
    generatedContentDisclosure:
      "Normalized from NGA MSI broadcast warnings. Coordinates parsed from warning text or NAVAREA centroid.",
    whyItMatters:
      "Navigational warnings flag mines, firing areas, and maritime hazards that affect logistics and presence.",
    sources: [
      {
        publisher: warning.authority || "NGA MSI",
        sourceUrl: "https://msi.nga.mil/NavWarnings",
        publishedAt: occurredAt,
        title: clip(`NAVAREA ${nav} ${idYear}-${idNum}`, 500),
        verificationStatus: "official",
      },
    ],
  };
}

async function fetchRssFeed(url: string): Promise<
  Array<{ title: string; link: string; description: string; pubDate?: string }>
> {
  const xml = await fetchText(url);
  return parseRssItems(xml);
}

export async function fetchCisaKev(now = Date.now()): Promise<ProviderRecord[]> {
  const data = await fetchJson<{ vulnerabilities?: CisaVulnerability[] }>(
    CISA_KEV_URL,
  );
  const cutoff = now - 45 * 24 * 60 * 60 * 1000;
  const out: ProviderRecord[] = [];
  for (const vuln of data.vulnerabilities ?? []) {
    const mapped = mapCisaVulnerability(vuln, now, cutoff);
    if (mapped) out.push(mapped);
  }
  out.sort((a, b) => b.occurredAt - a.occurredAt);
  return out.slice(0, 25);
}

export async function fetchHealthOutbreaks(
  now = Date.now(),
): Promise<ProviderRecord[]> {
  const results = await Promise.allSettled(
    HEALTH_FEEDS.map(async (feed) => {
      const items = await fetchRssFeed(feed.url);
      return items
        .map((item) => mapHealthRssItem(item, feed.publisher, now))
        .filter((r): r is ProviderRecord => r != null);
    }),
  );
  const out: ProviderRecord[] = [];
  const seen = new Set<string>();
  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    for (const rec of r.value) {
      if (seen.has(rec.externalId)) continue;
      seen.add(rec.externalId);
      out.push(rec);
    }
  }
  out.sort((a, b) => b.occurredAt - a.occurredAt);
  return out.slice(0, 30);
}

export async function fetchOsintNews(now = Date.now()): Promise<ProviderRecord[]> {
  const results = await Promise.allSettled(
    NEWS_FEEDS.map(async (feed) => {
      const items = await fetchRssFeed(feed.url);
      return items
        .slice(0, 8)
        .map((item) => mapNewsRssItem(item, feed.publisher, now))
        .filter((r): r is ProviderRecord => r != null);
    }),
  );
  const out: ProviderRecord[] = [];
  const seen = new Set<string>();
  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    for (const rec of r.value) {
      if (seen.has(rec.externalId)) continue;
      seen.add(rec.externalId);
      out.push(rec);
    }
  }
  out.sort((a, b) => b.occurredAt - a.occurredAt);
  return out.slice(0, 40);
}

function extractNgaList(data: unknown): NgaWarningRaw[] {
  if (Array.isArray(data)) return data as NgaWarningRaw[];
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    const nested = obj["broadcast-warn"] ?? obj.data;
    if (Array.isArray(nested)) return nested as NgaWarningRaw[];
    if (nested && typeof nested === "object") return [nested as NgaWarningRaw];
  }
  return [];
}

export async function fetchNgaNavWarnings(
  now = Date.now(),
): Promise<ProviderRecord[]> {
  const data = await fetchJson<unknown>(NGA_WARNINGS_URL);
  const out: ProviderRecord[] = [];
  for (const warning of extractNgaList(data)) {
    const mapped = mapNgaWarning(warning, now);
    if (mapped) out.push(mapped);
    if (out.length >= 30) break;
  }
  return out;
}
