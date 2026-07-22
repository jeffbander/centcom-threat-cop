/**
 * ILLUSTRATIVE military / space overlay data for sensitive presentations.
 *
 * NOT real-time troop GPS, NOT classified force tracking, NOT live TLEs.
 * Built for visual COP "show" only — always label as illustrative.
 */

export type ForceSide = "blue" | "red" | "green" | "neutral";

export type UnitKind =
  | "armor"
  | "infantry"
  | "arty"
  | "air"
  | "naval"
  | "missile"
  | "hq"
  | "recon"
  | "log"
  | "ew";

export type IllustrativeUnit = {
  id: string;
  label: string;
  callsign?: string;
  side: ForceSide;
  theater: string;
  kind: UnitKind;
  latitude: number;
  longitude: number;
  note: string;
  /** Illustrative engagement / coverage radius in km */
  rangeKm?: number;
};

export type SatKind = "EO" | "SAR" | "SIGINT" | "COMM" | "ELINT" | "ISR";

export type IllustrativeSatellite = {
  id: string;
  name: string;
  kind: SatKind;
  note: string;
  track: Array<{ lat: number; lon: number }>;
  /** Visual speed: steps per tick (higher = faster along track) */
  speed?: number;
  /** Footprint radius km for show */
  footprintKm?: number;
};

export type TheaterAOI = {
  id: string;
  name: string;
  color: string;
  /** [lat, lon] corners as polygon ring */
  polygon: Array<[number, number]>;
  status: "HOT" | "ELEVATED" | "WATCH";
};

/** Build a decorative inclined ground track (lat/lon samples). */
export function buildOrbitTrack(opts: {
  inclination: number;
  lonAscending: number;
  latMax?: number;
  samples?: number;
  revolutions?: number;
}): Array<{ lat: number; lon: number }> {
  const samples = opts.samples ?? 48;
  const revs = opts.revolutions ?? 1.15;
  const latMax = opts.latMax ?? opts.inclination;
  const pts: Array<{ lat: number; lon: number }> = [];
  for (let i = 0; i <= samples; i++) {
    const t = (i / samples) * revs * Math.PI * 2;
    const lat = Math.sin(t) * latMax;
    const lon =
      ((opts.lonAscending + (i / samples) * 360 * revs) % 360 + 540) % 360 -
      180;
    // slight inclination skew
    const skew = Math.cos(t) * (opts.inclination * 0.08);
    pts.push({
      lat: Math.max(-85, Math.min(85, lat + skew)),
      lon,
    });
  }
  return pts;
}

function u(
  partial: IllustrativeUnit,
): IllustrativeUnit {
  return partial;
}

/** Approx force markers — theater-level, labeled illustrative. */
export const ILLUSTRATIVE_UNITS: IllustrativeUnit[] = [
  // —— UKRAINE ——
  u({
    id: "ua-hq-1",
    label: "BLUE HQ",
    callsign: "STEEL BASE",
    side: "blue",
    theater: "Ukraine",
    kind: "hq",
    latitude: 50.45,
    longitude: 30.52,
    note: "Illustrative national / theater C2",
    rangeKm: 40,
  }),
  u({
    id: "ua-armor-1",
    label: "BLUE ARMOR BDE",
    callsign: "ANVIL-6",
    side: "blue",
    theater: "Ukraine",
    kind: "armor",
    latitude: 48.62,
    longitude: 37.85,
    note: "Illustrative eastern armor mass",
    rangeKm: 25,
  }),
  u({
    id: "ua-armor-2",
    label: "BLUE ARMOR BN",
    callsign: "HAMMER-2",
    side: "blue",
    theater: "Ukraine",
    kind: "armor",
    latitude: 49.2,
    longitude: 37.1,
    note: "Illustrative reserve armor",
  }),
  u({
    id: "ua-inf-1",
    label: "BLUE INF BDE",
    callsign: "RIDGE-1",
    side: "blue",
    theater: "Ukraine",
    kind: "infantry",
    latitude: 49.05,
    longitude: 37.55,
    note: "Illustrative defensive belt",
  }),
  u({
    id: "ua-inf-2",
    label: "BLUE INF",
    callsign: "BUNKER-4",
    side: "blue",
    theater: "Ukraine",
    kind: "infantry",
    latitude: 48.0,
    longitude: 33.4,
    note: "Illustrative southern sector",
  }),
  u({
    id: "ua-arty-1",
    label: "BLUE FIRES",
    callsign: "THUNDER-3",
    side: "blue",
    theater: "Ukraine",
    kind: "arty",
    latitude: 48.9,
    longitude: 36.2,
    note: "Illustrative tube/rocket fires",
    rangeKm: 45,
  }),
  u({
    id: "ua-air-1",
    label: "BLUE AIR",
    callsign: "FALCON OPS",
    side: "blue",
    theater: "Ukraine",
    kind: "air",
    latitude: 50.0,
    longitude: 36.25,
    note: "Illustrative air basing",
    rangeKm: 120,
  }),
  u({
    id: "ua-ew-1",
    label: "BLUE EW",
    callsign: "STATIC-7",
    side: "blue",
    theater: "Ukraine",
    kind: "ew",
    latitude: 49.8,
    longitude: 35.0,
    note: "Illustrative electronic warfare node",
    rangeKm: 60,
  }),
  u({
    id: "ua-log-1",
    label: "BLUE LOG",
    callsign: "IRON ROAD",
    side: "blue",
    theater: "Ukraine",
    kind: "log",
    latitude: 49.8,
    longitude: 30.1,
    note: "Illustrative sustainment hub",
  }),
  u({
    id: "ru-hq-1",
    label: "RED HQ",
    callsign: "OPFOR C2",
    side: "red",
    theater: "Ukraine",
    kind: "hq",
    latitude: 47.1,
    longitude: 39.7,
    note: "Illustrative opposing theater HQ",
    rangeKm: 50,
  }),
  u({
    id: "ru-armor-1",
    label: "RED ARMOR",
    callsign: "OPFOR MBT",
    side: "red",
    theater: "Ukraine",
    kind: "armor",
    latitude: 48.15,
    longitude: 38.05,
    note: "Illustrative opposing armor",
    rangeKm: 28,
  }),
  u({
    id: "ru-armor-2",
    label: "RED ARMOR",
    callsign: "OPFOR MBT-B",
    side: "red",
    theater: "Ukraine",
    kind: "armor",
    latitude: 47.6,
    longitude: 37.5,
    note: "Illustrative secondary armor axis",
  }),
  u({
    id: "ru-arty-1",
    label: "RED FIRES",
    callsign: "OPFOR FS",
    side: "red",
    theater: "Ukraine",
    kind: "arty",
    latitude: 47.9,
    longitude: 37.6,
    note: "Illustrative opposing fires",
    rangeKm: 50,
  }),
  u({
    id: "ru-missile-1",
    label: "RED A2/AD",
    callsign: "OPFOR SAM",
    side: "red",
    theater: "Ukraine",
    kind: "missile",
    latitude: 45.0,
    longitude: 34.1,
    note: "Illustrative long-range fires / AD",
    rangeKm: 90,
  }),
  u({
    id: "ru-air-1",
    label: "RED AIR",
    callsign: "OPFOR AIR",
    side: "red",
    theater: "Ukraine",
    kind: "air",
    latitude: 46.5,
    longitude: 39.0,
    note: "Illustrative opposing air",
    rangeKm: 150,
  }),
  u({
    id: "ru-recon-1",
    label: "RED RECON",
    callsign: "OPFOR ISR",
    side: "red",
    theater: "Ukraine",
    kind: "recon",
    latitude: 48.4,
    longitude: 38.4,
    note: "Illustrative recon screen",
  }),

  // —— LEVANT ——
  u({
    id: "il-hq-1",
    label: "BLUE HQ",
    callsign: "HOMEPLATE",
    side: "blue",
    theater: "Levant",
    kind: "hq",
    latitude: 31.77,
    longitude: 35.21,
    note: "Illustrative national C2",
    rangeKm: 35,
  }),
  u({
    id: "il-air-1",
    label: "BLUE AIR",
    callsign: "VIPER",
    side: "blue",
    theater: "Levant",
    kind: "air",
    latitude: 31.2,
    longitude: 34.85,
    note: "Illustrative air basing",
    rangeKm: 180,
  }),
  u({
    id: "il-armor-1",
    label: "BLUE ARMOR",
    callsign: "SANDSTORM",
    side: "blue",
    theater: "Levant",
    kind: "armor",
    latitude: 31.35,
    longitude: 34.45,
    note: "Illustrative southern armor",
  }),
  u({
    id: "il-missile-1",
    label: "BLUE AD",
    callsign: "IRON DOME-X",
    side: "blue",
    theater: "Levant",
    kind: "missile",
    latitude: 32.1,
    longitude: 34.8,
    note: "Illustrative integrated AD node",
    rangeKm: 70,
  }),
  u({
    id: "il-naval-1",
    label: "BLUE NAV",
    callsign: "SEAWALL",
    side: "blue",
    theater: "Levant",
    kind: "naval",
    latitude: 32.0,
    longitude: 34.5,
    note: "Illustrative coastal naval marker",
  }),
  u({
    id: "gz-inf-1",
    label: "RED CELL",
    callsign: "URBAN-R",
    side: "red",
    theater: "Levant",
    kind: "infantry",
    latitude: 31.5,
    longitude: 34.46,
    note: "Illustrative dense urban cell — not targeting data",
  }),
  u({
    id: "lb-missile-1",
    label: "RED FS",
    callsign: "NORTH ARC",
    side: "red",
    theater: "Levant",
    kind: "missile",
    latitude: 33.85,
    longitude: 35.9,
    note: "Illustrative northern fires arc",
    rangeKm: 80,
  }),
  u({
    id: "lb-inf-1",
    label: "RED INF",
    callsign: "RIDGE-R",
    side: "red",
    theater: "Levant",
    kind: "infantry",
    latitude: 33.27,
    longitude: 35.55,
    note: "Illustrative northern infantry posture",
  }),
  u({
    id: "sy-recon-1",
    label: "RED RECON",
    callsign: "DESERT EYE",
    side: "red",
    theater: "Levant",
    kind: "recon",
    latitude: 33.5,
    longitude: 36.3,
    note: "Illustrative interior recon marker",
  }),

  // —— IRAN / GULF ——
  u({
    id: "ir-missile-1",
    label: "RED STRAT",
    callsign: "DEEP NODE",
    side: "red",
    theater: "Iran",
    kind: "missile",
    latitude: 32.0,
    longitude: 53.0,
    note: "Illustrative strategic depth — not a real site",
    rangeKm: 200,
  }),
  u({
    id: "ir-air-1",
    label: "RED AIR",
    callsign: "CAPITAL AIR",
    side: "red",
    theater: "Iran",
    kind: "air",
    latitude: 35.7,
    longitude: 51.4,
    note: "Illustrative capital air posture",
    rangeKm: 160,
  }),
  u({
    id: "ir-naval-1",
    label: "RED NAV",
    callsign: "STRAIT WATCH",
    side: "red",
    theater: "Iran",
    kind: "naval",
    latitude: 27.1,
    longitude: 56.3,
    note: "Illustrative Hormuz naval marker",
    rangeKm: 55,
  }),
  u({
    id: "ir-ew-1",
    label: "RED EW",
    callsign: "NOISE FLOOR",
    side: "red",
    theater: "Iran",
    kind: "ew",
    latitude: 29.6,
    longitude: 52.5,
    note: "Illustrative EW / radar cluster",
    rangeKm: 90,
  }),
  u({
    id: "us-nav-gulf",
    label: "BLUE CSG",
    callsign: "STRIKE GROUP",
    side: "blue",
    theater: "Gulf",
    kind: "naval",
    latitude: 26.5,
    longitude: 55.5,
    note: "Illustrative coalition maritime presence",
    rangeKm: 100,
  }),
  u({
    id: "us-air-gulf",
    label: "BLUE AIR",
    callsign: "DESERT EAGLE",
    side: "blue",
    theater: "Gulf",
    kind: "air",
    latitude: 26.2,
    longitude: 50.6,
    note: "Illustrative regional air access",
    rangeKm: 200,
  }),
  u({
    id: "us-log-gulf",
    label: "BLUE LOG",
    callsign: "ANCHOR HUB",
    side: "blue",
    theater: "Gulf",
    kind: "log",
    latitude: 25.3,
    longitude: 51.5,
    note: "Illustrative logistics node",
  }),

  // —— RED SEA ——
  u({
    id: "ye-missile-1",
    label: "RED ASuW",
    callsign: "COAST ARC",
    side: "red",
    theater: "Red Sea",
    kind: "missile",
    latitude: 14.5,
    longitude: 43.0,
    note: "Illustrative anti-shipping threat",
    rangeKm: 120,
  }),
  u({
    id: "ye-naval-1",
    label: "RED BOAT",
    callsign: "FAST ATTACK",
    side: "red",
    theater: "Red Sea",
    kind: "naval",
    latitude: 15.3,
    longitude: 42.6,
    note: "Illustrative small-boat threat marker",
  }),
  u({
    id: "coal-nav-rs",
    label: "BLUE ESCORT",
    callsign: "SAFE PASSAGE",
    side: "blue",
    theater: "Red Sea",
    kind: "naval",
    latitude: 13.5,
    longitude: 42.8,
    note: "Illustrative escort / presence",
    rangeKm: 70,
  }),
  u({
    id: "coal-nav-rs-2",
    label: "BLUE NAV",
    callsign: "CONVOY GUARD",
    side: "blue",
    theater: "Red Sea",
    kind: "naval",
    latitude: 16.0,
    longitude: 41.5,
    note: "Illustrative northern Red Sea presence",
  }),

  // —— INDO-PAC / TAIWAN STRAIT (show density) ——
  u({
    id: "tw-hq-1",
    label: "BLUE HQ",
    callsign: "ISLAND C2",
    side: "blue",
    theater: "Taiwan Strait",
    kind: "hq",
    latitude: 25.03,
    longitude: 121.56,
    note: "Illustrative island C2",
  }),
  u({
    id: "tw-naval-1",
    label: "BLUE NAV",
    callsign: "STRAIT WATCH-B",
    side: "blue",
    theater: "Taiwan Strait",
    kind: "naval",
    latitude: 24.5,
    longitude: 120.2,
    note: "Illustrative naval screen",
  }),
  u({
    id: "tw-missile-1",
    label: "BLUE A2/AD",
    callsign: "COASTAL FS",
    side: "blue",
    theater: "Taiwan Strait",
    kind: "missile",
    latitude: 24.1,
    longitude: 120.6,
    note: "Illustrative coastal defense",
    rangeKm: 80,
  }),
  u({
    id: "cn-naval-1",
    label: "RED NAV",
    callsign: "OPFOR FLEET",
    side: "red",
    theater: "Taiwan Strait",
    kind: "naval",
    latitude: 25.5,
    longitude: 119.0,
    note: "Illustrative opposing naval presence",
    rangeKm: 90,
  }),
  u({
    id: "cn-air-1",
    label: "RED AIR",
    callsign: "OPFOR CAP",
    side: "red",
    theater: "Taiwan Strait",
    kind: "air",
    latitude: 26.0,
    longitude: 119.3,
    note: "Illustrative opposing air activity zone",
    rangeKm: 180,
  }),
];

/** Theater areas of interest (illustrative polygons). */
export const THEATER_AOIS: TheaterAOI[] = [
  {
    id: "aoi-ukraine",
    name: "AO UKRAINE",
    color: "#ef4444",
    status: "HOT",
    polygon: [
      [52.5, 22.0],
      [52.5, 40.5],
      [44.0, 40.5],
      [44.0, 22.0],
    ],
  },
  {
    id: "aoi-levant",
    name: "AO LEVANT",
    color: "#f59e0b",
    status: "HOT",
    polygon: [
      [34.5, 33.5],
      [34.5, 37.0],
      [29.5, 37.0],
      [29.5, 33.5],
    ],
  },
  {
    id: "aoi-gulf",
    name: "AO GULF / HORMUZ",
    color: "#eab308",
    status: "ELEVATED",
    polygon: [
      [30.5, 47.0],
      [30.5, 58.0],
      [23.5, 58.0],
      [23.5, 47.0],
    ],
  },
  {
    id: "aoi-redsea",
    name: "AO RED SEA",
    color: "#f97316",
    status: "ELEVATED",
    polygon: [
      [28.0, 32.5],
      [28.0, 44.5],
      [11.0, 44.5],
      [11.0, 32.5],
    ],
  },
  {
    id: "aoi-strait",
    name: "AO TAIWAN STRAIT",
    color: "#38bdf8",
    status: "WATCH",
    polygon: [
      [27.5, 117.5],
      [27.5, 123.5],
      [22.0, 123.5],
      [22.0, 117.5],
    ],
  },
];

/** Decorative satellite constellation (not real TLEs). */
export const ILLUSTRATIVE_SATELLITES: IllustrativeSatellite[] = [
  {
    id: "sat-eo-alpha",
    name: "EO-ALPHA",
    kind: "EO",
    note: "Illustrative EO recon pass — sensitive ephemeris",
    speed: 1,
    footprintKm: 180,
    track: buildOrbitTrack({
      inclination: 52,
      lonAscending: -40,
      samples: 64,
      revolutions: 1.2,
    }),
  },
  {
    id: "sat-eo-bravo",
    name: "EO-BRAVO",
    kind: "EO",
    note: "Illustrative second EO plane",
    speed: 1,
    footprintKm: 160,
    track: buildOrbitTrack({
      inclination: 48,
      lonAscending: 80,
      samples: 64,
      revolutions: 1.15,
    }),
  },
  {
    id: "sat-sar-1",
    name: "SAR-NIGHTFALL",
    kind: "SAR",
    note: "Illustrative SAR all-weather track",
    speed: 1,
    footprintKm: 220,
    track: buildOrbitTrack({
      inclination: 60,
      lonAscending: 10,
      samples: 72,
      revolutions: 1.25,
    }),
  },
  {
    id: "sat-sar-2",
    name: "SAR-GHOST",
    kind: "SAR",
    note: "Illustrative polar-leaning SAR",
    speed: 2,
    footprintKm: 200,
    track: buildOrbitTrack({
      inclination: 72,
      lonAscending: -120,
      latMax: 78,
      samples: 72,
      revolutions: 1.1,
    }),
  },
  {
    id: "sat-sigint-1",
    name: "SIGINT-RAVEN",
    kind: "SIGINT",
    note: "Illustrative SIGINT collector path",
    speed: 1,
    footprintKm: 350,
    track: buildOrbitTrack({
      inclination: 55,
      lonAscending: 30,
      samples: 56,
      revolutions: 1.3,
    }),
  },
  {
    id: "sat-elint-1",
    name: "ELINT-SPECTRE",
    kind: "ELINT",
    note: "Illustrative ELINT / radar order-of-battle path",
    speed: 1,
    footprintKm: 300,
    track: buildOrbitTrack({
      inclination: 45,
      lonAscending: 150,
      samples: 56,
      revolutions: 1.2,
    }),
  },
  {
    id: "sat-comm-1",
    name: "COMM-RELAY-1",
    kind: "COMM",
    note: "Illustrative SATCOM relay ground track",
    speed: 1,
    footprintKm: 500,
    track: buildOrbitTrack({
      inclination: 28,
      lonAscending: -90,
      latMax: 30,
      samples: 48,
      revolutions: 0.95,
    }),
  },
  {
    id: "sat-comm-2",
    name: "COMM-RELAY-2",
    kind: "COMM",
    note: "Illustrative second SATCOM plane",
    speed: 1,
    footprintKm: 500,
    track: buildOrbitTrack({
      inclination: 28,
      lonAscending: 90,
      latMax: 30,
      samples: 48,
      revolutions: 0.95,
    }),
  },
  {
    id: "sat-isr-mideast",
    name: "ISR-DESERT EYE",
    kind: "ISR",
    note: "Illustrative persistent ISR figure-eight over ME",
    speed: 1,
    footprintKm: 140,
    track: [
      { lat: 38, lon: 28 },
      { lat: 36, lon: 34 },
      { lat: 33, lon: 40 },
      { lat: 30, lon: 46 },
      { lat: 28, lon: 52 },
      { lat: 30, lon: 56 },
      { lat: 33, lon: 52 },
      { lat: 36, lon: 46 },
      { lat: 38, lon: 40 },
      { lat: 36, lon: 34 },
      { lat: 33, lon: 30 },
      { lat: 30, lon: 34 },
      { lat: 32, lon: 40 },
      { lat: 35, lon: 44 },
    ],
  },
  {
    id: "sat-isr-ukraine",
    name: "ISR-STEEL EYE",
    kind: "ISR",
    note: "Illustrative theater ISR loop — Ukraine AO",
    speed: 1,
    footprintKm: 120,
    track: [
      { lat: 52, lon: 24 },
      { lat: 50, lon: 28 },
      { lat: 48, lon: 32 },
      { lat: 47, lon: 36 },
      { lat: 46, lon: 38 },
      { lat: 47, lon: 40 },
      { lat: 49, lon: 38 },
      { lat: 51, lon: 34 },
      { lat: 52, lon: 30 },
      { lat: 51, lon: 26 },
    ],
  },
  {
    id: "sat-eo-indopac",
    name: "EO-PACRIM",
    kind: "EO",
    note: "Illustrative Indo-Pacific EO plane",
    speed: 1,
    footprintKm: 170,
    track: buildOrbitTrack({
      inclination: 50,
      lonAscending: 100,
      samples: 60,
      revolutions: 1.15,
    }),
  },
  {
    id: "sat-sigint-2",
    name: "SIGINT-OWL",
    kind: "SIGINT",
    note: "Illustrative high-inclination SIGINT",
    speed: 2,
    footprintKm: 320,
    track: buildOrbitTrack({
      inclination: 70,
      lonAscending: -20,
      latMax: 75,
      samples: 64,
      revolutions: 1.1,
    }),
  },
];

export const SIDE_COLOR: Record<ForceSide, string> = {
  blue: "#38bdf8",
  red: "#ef4444",
  green: "#22c55e",
  neutral: "#94a3b8",
};

export const KIND_GLYPH: Record<UnitKind, string> = {
  armor: "◆",
  infantry: "●",
  arty: "▲",
  air: "✦",
  naval: "▣",
  missile: "✶",
  hq: "⬡",
  recon: "◎",
  log: "▤",
  ew: "⚡",
};

export const SAT_KIND_COLOR: Record<SatKind, string> = {
  EO: "#a78bfa",
  SAR: "#38bdf8",
  SIGINT: "#f59e0b",
  ELINT: "#fb923c",
  COMM: "#22c55e",
  ISR: "#f472b6",
};

export const SAT_KIND_LABEL: Record<SatKind, string> = {
  EO: "Electro-optical",
  SAR: "Synthetic aperture radar",
  SIGINT: "Signals intelligence",
  ELINT: "Electronic intelligence",
  COMM: "Communications relay",
  ISR: "Theater ISR",
};

/** km → degrees latitude approx */
export function kmToLatDeg(km: number): number {
  return km / 111;
}

export function kmToLonDeg(km: number, atLat: number): number {
  const c = Math.cos((atLat * Math.PI) / 180);
  return km / (111 * Math.max(0.2, c));
}
