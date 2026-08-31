/** Curated official public webcams (NPS / USGS / NOAA pages). Not CCTV. */

import { haversineKm, type PublicCam } from "./tracks";

type CamSeed = {
  id: string;
  name: string;
  operator: string;
  latitude: number;
  longitude: number;
  pageUrl: string;
  stillUrl?: string;
  note: string;
};

const SEED: CamSeed[] = [
  {
    id: "usgs-kilauea",
    name: "Kīlauea summit",
    operator: "USGS Hawaiian Volcano Observatory",
    latitude: 19.4069,
    longitude: -155.2834,
    pageUrl: "https://www.usgs.gov/observatories/hvo/webcams",
    note: "USGS volcano observatory webcam page",
  },
  {
    id: "nps-old-faithful",
    name: "Old Faithful",
    operator: "National Park Service",
    latitude: 44.4604,
    longitude: -110.828,
    pageUrl: "https://www.nps.gov/yell/learn/photosmultimedia/webcams.htm",
    note: "NPS Yellowstone public webcam page",
  },
  {
    id: "nps-grand-canyon",
    name: "Grand Canyon",
    operator: "National Park Service",
    latitude: 36.0544,
    longitude: -112.1401,
    pageUrl: "https://www.nps.gov/grca/learn/photosmultimedia/webcams.htm",
    note: "NPS Grand Canyon public webcam page",
  },
  {
    id: "noaa-sf",
    name: "San Francisco Bay",
    operator: "NOAA",
    latitude: 37.806,
    longitude: -122.451,
    pageUrl: "https://cdn.star.nesdis.noaa.gov/GOES18/ABI/SECTOR/wus/GEOCOLOR/",
    note: "NOAA GOES West geocolor sector (public satellite stills, not a street cam)",
  },
  {
    id: "noaa-east",
    name: "US East Coast GOES",
    operator: "NOAA",
    latitude: 35.2,
    longitude: -75.5,
    pageUrl: "https://cdn.star.nesdis.noaa.gov/GOES16/ABI/SECTOR/eus/GEOCOLOR/",
    note: "NOAA GOES East geocolor sector (public satellite stills)",
  },
  {
    id: "usgs-rainier",
    name: "Mount Rainier",
    operator: "USGS Cascades Volcano Observatory",
    latitude: 46.8523,
    longitude: -121.7603,
    pageUrl: "https://www.usgs.gov/observatories/cvo/webcams",
    note: "USGS Cascades volcano webcam page",
  },
  {
    id: "nps-yosemite",
    name: "Yosemite Valley",
    operator: "National Park Service",
    latitude: 37.7459,
    longitude: -119.5936,
    pageUrl: "https://www.nps.gov/yose/learn/photosmultimedia/webcams.htm",
    note: "NPS Yosemite public webcam page",
  },
  {
    id: "nws-key-west",
    name: "Key West",
    operator: "NWS Key West",
    latitude: 24.5557,
    longitude: -81.7826,
    pageUrl: "https://www.weather.gov/key/",
    note: "NWS office page; public weather camera if published",
  },
  {
    id: "nws-miami",
    name: "Miami",
    operator: "NWS Miami",
    latitude: 25.7617,
    longitude: -80.1918,
    pageUrl: "https://www.weather.gov/mfl/",
    note: "NWS Miami public office page",
  },
  {
    id: "nws-norfolk",
    name: "Norfolk / Hampton Roads",
    operator: "NWS Wakefield",
    latitude: 36.8508,
    longitude: -76.2859,
    pageUrl: "https://www.weather.gov/akq/",
    note: "NWS Wakefield public office page",
  },
  {
    id: "port-la",
    name: "Port of Los Angeles",
    operator: "Port of Los Angeles",
    latitude: 33.7361,
    longitude: -118.2639,
    pageUrl: "https://www.portoflosangeles.org/",
    note: "Official port site; public cams if listed there",
  },
  {
    id: "port-ny",
    name: "New York Harbor",
    operator: "NOAA / NWS New York",
    latitude: 40.6681,
    longitude: -74.0451,
    pageUrl: "https://www.weather.gov/okx/",
    note: "NWS New York public office page",
  },
  {
    id: "bosporus",
    name: "Istanbul / Bosphorus",
    operator: "Open listing",
    latitude: 41.1188,
    longitude: 29.075,
    pageUrl: "https://www.earthcam.com/world/turkey/istanbul/",
    note: "Public EarthCam tourist feed — not a government CCTV tap",
  },
  {
    id: "gibraltar",
    name: "Strait of Gibraltar",
    operator: "Open listing",
    latitude: 36.133,
    longitude: -5.351,
    pageUrl: "https://www.earthcam.com/",
    note: "Public tourist/traffic cam directories only",
  },
  {
    id: "suez",
    name: "Suez Canal approaches",
    operator: "Open listing",
    latitude: 31.265,
    longitude: 32.342,
    pageUrl: "https://www.suezcanal.gov.eg/",
    note: "Official canal authority site; no scraped CCTV",
  },
  {
    id: "hormuz",
    name: "Strait of Hormuz approaches",
    operator: "Open listing",
    latitude: 26.566,
    longitude: 56.25,
    pageUrl: "https://earth.nullschool.net/",
    note: "No official public street cam; weather/current visualization only",
  },
  {
    id: "odessa",
    name: "Odesa",
    operator: "Open listing",
    latitude: 46.4825,
    longitude: 30.7233,
    pageUrl: "https://www.earthcam.com/",
    note: "Public tourist cam directories if a feed is listed — not CCTV",
  },
];

export function nearbyCuratedWebcams(
  origin: { latitude: number; longitude: number },
  radiusKm = 50,
): PublicCam[] {
  const out: PublicCam[] = [];
  for (const c of SEED) {
    const distanceKm = haversineKm(origin, c);
    if (distanceKm > radiusKm) continue;
    out.push({
      id: c.id,
      name: c.name,
      operator: c.operator,
      latitude: c.latitude,
      longitude: c.longitude,
      distanceKm,
      pageUrl: c.pageUrl,
      stillUrl: c.stillUrl ?? null,
      note: c.note,
    });
  }
  out.sort((a, b) => a.distanceKm - b.distanceKm);
  return out.slice(0, 8);
}
