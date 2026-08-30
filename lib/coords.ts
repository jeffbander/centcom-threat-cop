/** Geographic readouts for the COP cursor HUD (DMS + compact MGRS-style decimal). */

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

function dmsPart(deg: number, pos: string, neg: string): string {
  const hemi = deg >= 0 ? pos : neg;
  const abs = Math.abs(deg);
  let d = Math.floor(abs);
  let mFloat = (abs - d) * 60;
  let m = Math.floor(mFloat);
  let s = Math.round((mFloat - m) * 60 * 10) / 10;
  if (s >= 60) {
    s = 0;
    m += 1;
  }
  if (m >= 60) {
    m = 0;
    d += 1;
  }
  return `${d}°${pad2(m)}'${s.toFixed(1).padStart(4, "0")}"${hemi}`;
}

export function formatDms(lat: number, lon: number): string {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return "—";
  return `${dmsPart(lat, "N", "S")} ${dmsPart(lon, "E", "W")}`;
}

const MONTHS_Z = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
] as const;

/** DTG: 291234Z AUG 26 */
export function formatZuluDtg(now = Date.now()): string {
  const d = new Date(now);
  const dd = pad2(d.getUTCDate());
  const hh = pad2(d.getUTCHours());
  const mm = pad2(d.getUTCMinutes());
  const mon = MONTHS_Z[d.getUTCMonth()];
  const yy = String(d.getUTCFullYear()).slice(2);
  return `${dd}${hh}${mm}Z ${mon} ${yy}`;
}
