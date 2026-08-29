/**
 * Curated public OSINT infrastructure overlays for the COP map.
 *
 * Coordinates and names drawn from open datasets catalogued by
 * world-intel-mcp (MIT). Sparse and illustrative — not an exhaustive
 * registry, not live tracking, not targeting data.
 */

export type OsintKind = "base" | "port" | "nuclear" | "cable";

export type OsintSite = {
  id: string;
  kind: OsintKind;
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  note: string;
};

export type OsintCable = {
  id: string;
  name: string;
  note: string;
  /** Approximate landing / corridor points [lat, lon] */
  path: Array<[number, number]>;
};

export const OSINT_SITES: OsintSite[] = [
  // —— Bases (publicly reported facilities) ——
  {
    id: "base-al-udeid",
    kind: "base",
    name: "Al Udeid Air Base",
    country: "Qatar",
    latitude: 25.12,
    longitude: 51.31,
    note: "Publicly reported CENTCOM forward HQ",
  },
  {
    id: "base-bahrain-nsa",
    kind: "base",
    name: "NSA Bahrain",
    country: "Bahrain",
    latitude: 26.23,
    longitude: 50.58,
    note: "Publicly reported 5th Fleet HQ",
  },
  {
    id: "base-incirlik",
    kind: "base",
    name: "Incirlik Air Base",
    country: "Turkey",
    latitude: 37.0,
    longitude: 35.43,
    note: "Publicly reported NATO air base",
  },
  {
    id: "base-diego-garcia",
    kind: "base",
    name: "Diego Garcia",
    country: "BIOT",
    latitude: -7.32,
    longitude: 72.42,
    note: "Publicly reported Indian Ocean logistics hub",
  },
  {
    id: "base-camp-lemonnier",
    kind: "base",
    name: "Camp Lemonnier",
    country: "Djibouti",
    latitude: 11.55,
    longitude: 43.15,
    note: "Publicly reported AFRICOM presence",
  },
  {
    id: "base-ramstein",
    kind: "base",
    name: "Ramstein Air Base",
    country: "Germany",
    latitude: 49.44,
    longitude: 7.6,
    note: "Publicly reported USAFE hub",
  },
  {
    id: "base-yokosuka",
    kind: "base",
    name: "Yokosuka Naval Base",
    country: "Japan",
    latitude: 35.28,
    longitude: 139.67,
    note: "Publicly reported 7th Fleet HQ",
  },
  {
    id: "base-kadena",
    kind: "base",
    name: "Kadena Air Base",
    country: "Japan",
    latitude: 26.35,
    longitude: 127.77,
    note: "Publicly reported Pacific air base",
  },
  {
    id: "base-andersen",
    kind: "base",
    name: "Andersen AFB",
    country: "Guam",
    latitude: 13.58,
    longitude: 144.93,
    note: "Publicly reported bomber-capable Pacific base",
  },
  {
    id: "base-humphreys",
    kind: "base",
    name: "Camp Humphreys",
    country: "South Korea",
    latitude: 36.96,
    longitude: 127.03,
    note: "Publicly reported USFK HQ",
  },
  {
    id: "base-tartus",
    kind: "base",
    name: "Tartus",
    country: "Syria",
    latitude: 34.89,
    longitude: 35.89,
    note: "Publicly reported Russian naval facility",
  },
  {
    id: "base-hmeimim",
    kind: "base",
    name: "Hmeimim",
    country: "Syria",
    latitude: 35.41,
    longitude: 35.95,
    note: "Publicly reported Russian air facility",
  },
  {
    id: "base-sevastopol",
    kind: "base",
    name: "Sevastopol",
    country: "Crimea",
    latitude: 44.62,
    longitude: 33.53,
    note: "Publicly reported Black Sea Fleet HQ (disputed)",
  },
  {
    id: "base-bandar-abbas",
    kind: "base",
    name: "Bandar Abbas",
    country: "Iran",
    latitude: 27.18,
    longitude: 56.24,
    note: "Publicly reported IRIN/IRGCN naval hub",
  },
  {
    id: "base-djibouti-chn",
    kind: "base",
    name: "PLA Djibouti Support Base",
    country: "Djibouti",
    latitude: 11.59,
    longitude: 43.11,
    note: "Publicly reported first PLA overseas base",
  },
  {
    id: "base-yulin",
    kind: "base",
    name: "Yulin Naval Base",
    country: "China",
    latitude: 18.23,
    longitude: 109.55,
    note: "Publicly reported PLAN South Sea facility",
  },
  {
    id: "base-norfolk",
    kind: "base",
    name: "Norfolk Naval Station",
    country: "United States",
    latitude: 36.95,
    longitude: -76.33,
    note: "Publicly reported largest US naval station",
  },
  {
    id: "base-pearl",
    kind: "base",
    name: "Pearl Harbor",
    country: "United States",
    latitude: 21.35,
    longitude: -157.97,
    note: "Publicly reported Pacific Fleet HQ",
  },

  // —— Ports ——
  {
    id: "port-jebel-ali",
    kind: "port",
    name: "Jebel Ali",
    country: "UAE",
    latitude: 25.01,
    longitude: 55.06,
    note: "Largest container port in the Middle East",
  },
  {
    id: "port-ras-tanura",
    kind: "port",
    name: "Ras Tanura",
    country: "Saudi Arabia",
    latitude: 26.64,
    longitude: 50.17,
    note: "Major oil export terminal",
  },
  {
    id: "port-kharg",
    kind: "port",
    name: "Kharg Island",
    country: "Iran",
    latitude: 29.24,
    longitude: 50.33,
    note: "Primary Iranian oil export terminal",
  },
  {
    id: "port-basra",
    kind: "port",
    name: "Basra Oil Terminal",
    country: "Iraq",
    latitude: 29.68,
    longitude: 48.8,
    note: "Iraq’s primary seaborne oil export point",
  },
  {
    id: "port-fujairah",
    kind: "port",
    name: "Fujairah",
    country: "UAE",
    latitude: 25.15,
    longitude: 56.36,
    note: "Hormuz-bypass bunkering and oil hub",
  },
  {
    id: "port-ras-laffan",
    kind: "port",
    name: "Ras Laffan",
    country: "Qatar",
    latitude: 25.93,
    longitude: 51.53,
    note: "Major LNG export complex",
  },
  {
    id: "port-singapore",
    kind: "port",
    name: "Singapore",
    country: "Singapore",
    latitude: 1.26,
    longitude: 103.83,
    note: "Malacca Strait transshipment hub",
  },
  {
    id: "port-shanghai",
    kind: "port",
    name: "Shanghai",
    country: "China",
    latitude: 30.63,
    longitude: 122.07,
    note: "World’s busiest container port (public stats)",
  },
  {
    id: "port-rotterdam",
    kind: "port",
    name: "Rotterdam",
    country: "Netherlands",
    latitude: 51.89,
    longitude: 4.29,
    note: "Europe’s largest port",
  },
  {
    id: "port-gwadar",
    kind: "port",
    name: "Gwadar",
    country: "Pakistan",
    latitude: 25.12,
    longitude: 62.33,
    note: "CPEC deep-water port",
  },
  {
    id: "port-djibouti",
    kind: "port",
    name: "Doraleh / Djibouti",
    country: "Djibouti",
    latitude: 11.59,
    longitude: 43.09,
    note: "Horn of Africa logistics hub",
  },
  {
    id: "port-odessa",
    kind: "port",
    name: "Odesa",
    country: "Ukraine",
    latitude: 46.49,
    longitude: 30.74,
    note: "Black Sea grain / logistics port",
  },

  // —— Nuclear ——
  {
    id: "npp-zaporizhzhia",
    kind: "nuclear",
    name: "Zaporizhzhia NPP",
    country: "Ukraine",
    latitude: 47.51,
    longitude: 34.58,
    note: "Europe’s largest NPP — publicly reported occupied since 2022",
  },
  {
    id: "npp-chernobyl",
    kind: "nuclear",
    name: "Chernobyl",
    country: "Ukraine",
    latitude: 51.39,
    longitude: 30.1,
    note: "1986 disaster site / exclusion zone",
  },
  {
    id: "npp-barakah",
    kind: "nuclear",
    name: "Barakah",
    country: "UAE",
    latitude: 23.97,
    longitude: 52.26,
    note: "First Arab nuclear power plant",
  },
  {
    id: "npp-natanz",
    kind: "nuclear",
    name: "Natanz",
    country: "Iran",
    latitude: 33.72,
    longitude: 51.73,
    note: "Publicly reported enrichment site",
  },
  {
    id: "npp-fordow",
    kind: "nuclear",
    name: "Fordow",
    country: "Iran",
    latitude: 34.88,
    longitude: 51.59,
    note: "Publicly reported underground enrichment site",
  },
  {
    id: "npp-dimona",
    kind: "nuclear",
    name: "Dimona",
    country: "Israel",
    latitude: 31.0,
    longitude: 35.15,
    note: "Publicly reported research reactor complex",
  },
  {
    id: "npp-yongbyon",
    kind: "nuclear",
    name: "Yongbyon",
    country: "North Korea",
    latitude: 39.8,
    longitude: 125.75,
    note: "Publicly reported plutonium production site",
  },
  {
    id: "npp-bushehr",
    kind: "nuclear",
    name: "Bushehr",
    country: "Iran",
    latitude: 28.83,
    longitude: 50.89,
    note: "Publicly reported power reactor",
  },
];

export const OSINT_CABLES: OsintCable[] = [
  {
    id: "cable-seamewe5",
    name: "SEA-ME-WE 5 (corridor)",
    note: "Approximate Marseille–Singapore trunk — not the true cable route",
    path: [
      [43.3, 5.37],
      [31.2, 32.35],
      [21.5, 39.16],
      [12.8, 45.0],
      [19.0, 72.8],
      [1.26, 103.83],
    ],
  },
  {
    id: "cable-aae1",
    name: "AAE-1 (corridor)",
    note: "Approximate Hong Kong–Marseille corridor",
    path: [
      [22.3, 114.17],
      [1.3, 103.8],
      [12.8, 45.0],
      [30.0, 32.5],
      [43.3, 5.37],
    ],
  },
  {
    id: "cable-flag",
    name: "FLAG Europe-Asia (corridor)",
    note: "Approximate UK–Egypt–India–Japan corridor",
    path: [
      [51.5, -0.1],
      [36.8, -2.5],
      [31.2, 32.3],
      [25.0, 55.0],
      [19.0, 72.8],
      [1.3, 103.8],
      [35.4, 139.8],
    ],
  },
  {
    id: "cable-tat14",
    name: "TAT-14 (corridor)",
    note: "Approximate US East Coast–UK transatlantic",
    path: [
      [39.0, -74.0],
      [48.0, -30.0],
      [51.0, -5.0],
    ],
  },
  {
    id: "cable-faster",
    name: "FASTER (corridor)",
    note: "Approximate Japan–Oregon transpacific",
    path: [
      [35.4, 139.8],
      [40.0, -170.0],
      [44.6, -124.0],
    ],
  },
  {
    id: "cable-2africa",
    name: "2Africa (corridor)",
    note: "Approximate Red Sea–Cape–West Africa arc",
    path: [
      [31.2, 32.3],
      [12.5, 43.5],
      [-4.0, 39.7],
      [-33.9, 18.4],
      [6.4, 3.4],
      [36.8, -6.3],
    ],
  },
];

export const OSINT_KIND_COLOR: Record<OsintKind, string> = {
  base: "#86efac",
  port: "#38bdf8",
  nuclear: "#fbbf24",
  cable: "#c084fc",
};

export const OSINT_KIND_LABEL: Record<OsintKind, string> = {
  base: "Military facility (OSINT)",
  port: "Strategic port (OSINT)",
  nuclear: "Nuclear facility (OSINT)",
  cable: "Subsea cable corridor (approx.)",
};

export const OSINT_KIND_GLYPH: Record<OsintKind, string> = {
  base: "▣",
  port: "◆",
  nuclear: "▲",
  cable: "●",
};
