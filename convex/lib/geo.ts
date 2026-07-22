/** Lightweight region / country inference for open-source event mapping. */

export type RegionName =
  | "North America"
  | "South America"
  | "Europe"
  | "Middle East"
  | "Africa"
  | "Asia"
  | "Oceania"
  | "Global";

export function regionFromLatLon(lat: number, lon: number): RegionName {
  // Crude but deterministic operational regions for dashboard filters.
  if (lat < -60) return "Oceania";
  if (lon >= -170 && lon <= -30) {
    if (lat >= 15) return "North America";
    if (lat >= -60) return "South America";
  }
  if (lon > -30 && lon < 45 && lat >= 35) return "Europe";
  if (lon >= 25 && lon <= 65 && lat >= 12 && lat <= 42) return "Middle East";
  if (lon >= -20 && lon <= 55 && lat < 37 && lat > -35) return "Africa";
  if (lon >= 60 && lon <= 150 && lat >= -10 && lat <= 55) return "Asia";
  if (lon > 110 || lon < -150) {
    if (lat < 0) return "Oceania";
  }
  if (lon >= 95 && lon <= 180 && lat < 10) return "Oceania";
  if (lat >= 35 && lon >= -10 && lon <= 40) return "Europe";
  if (lat >= 5 && lon >= 25 && lon <= 60) return "Middle East";
  return "Global";
}

/** Keyword → approximate capital/center for news items without coordinates. */
const PLACE_HINTS: Array<{
  match: RegExp;
  lat: number;
  lon: number;
  countryCode: string;
  region: RegionName;
}> = [
  { match: /\bukraine|kyiv|kharkiv|odonetsk|crimea\b/i, lat: 50.45, lon: 30.52, countryCode: "UA", region: "Europe" },
  { match: /\brussia|moscow|kremlin\b/i, lat: 55.75, lon: 37.62, countryCode: "RU", region: "Europe" },
  { match: /\bgaza|israel|west bank|hezbollah|lebanon|beirut|tel aviv\b/i, lat: 31.5, lon: 34.47, countryCode: "PS", region: "Middle East" },
  { match: /\biran|tehran|strait of hormuz\b/i, lat: 35.69, lon: 51.39, countryCode: "IR", region: "Middle East" },
  { match: /\bsyria|damascus\b/i, lat: 33.51, lon: 36.29, countryCode: "SY", region: "Middle East" },
  { match: /\byemen|houthi|red sea|bab el-?mandeb\b/i, lat: 12.8, lon: 45.0, countryCode: "YE", region: "Middle East" },
  { match: /\bsudan|khartoum|darfur\b/i, lat: 15.5, lon: 32.56, countryCode: "SD", region: "Africa" },
  { match: /\bsahel|mali|niger|burkina\b/i, lat: 12.65, lon: -8.0, countryCode: "ML", region: "Africa" },
  { match: /\btaiwan|taipei|taiwan strait\b/i, lat: 25.03, lon: 121.57, countryCode: "TW", region: "Asia" },
  { match: /\bchina|beijing|south china sea|scs\b/i, lat: 22.2, lon: 114.1, countryCode: "CN", region: "Asia" },
  { match: /\bnorth korea|dprk|pyongyang\b/i, lat: 39.04, lon: 125.76, countryCode: "KP", region: "Asia" },
  { match: /\bmyanmar|rakhine\b/i, lat: 19.76, lon: 96.07, countryCode: "MM", region: "Asia" },
  { match: /\bindia|pakistan|kashmir|line of control\b/i, lat: 34.08, lon: 74.8, countryCode: "IN", region: "Asia" },
  { match: /\bhaiti|port-au-prince\b/i, lat: 18.59, lon: -72.31, countryCode: "HT", region: "North America" },
  { match: /\bvenezuela|caracas\b/i, lat: 10.48, lon: -66.9, countryCode: "VE", region: "South America" },
  { match: /\bnato|brussels|european union|eu\b/i, lat: 50.85, lon: 4.35, countryCode: "BE", region: "Europe" },
  { match: /\bunited nations|security council|new york\b/i, lat: 40.75, lon: -73.97, countryCode: "US", region: "North America" },
  { match: /\bafghanistan|kabul\b/i, lat: 34.53, lon: 69.17, countryCode: "AF", region: "Asia" },
  { match: /\biraq|baghdad\b/i, lat: 33.31, lon: 44.37, countryCode: "IQ", region: "Middle East" },
  { match: /\bsomalia|mogadishu\b/i, lat: 2.05, lon: 45.34, countryCode: "SO", region: "Africa" },
  { match: /\bcongo|drc|goma\b/i, lat: -1.68, lon: 29.23, countryCode: "CD", region: "Africa" },
  { match: /\bphilippines|manila|south china\b/i, lat: 14.6, lon: 120.98, countryCode: "PH", region: "Asia" },
];

export function geocodeFromText(text: string): {
  latitude: number;
  longitude: number;
  countryCode: string;
  region: RegionName;
} | null {
  for (const hint of PLACE_HINTS) {
    if (hint.match.test(text)) {
      return {
        latitude: hint.lat,
        longitude: hint.lon,
        countryCode: hint.countryCode,
        region: hint.region,
      };
    }
  }
  return null;
}
