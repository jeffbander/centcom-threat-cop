export function isValidLatitude(value: number): boolean {
  return Number.isFinite(value) && value >= -90 && value <= 90;
}

export function isValidLongitude(value: number): boolean {
  return Number.isFinite(value) && value >= -180 && value <= 180;
}

export function isValidTimestamp(value: number): boolean {
  return Number.isFinite(value) && value > 0 && value < 1e14;
}

export function isSafeHttpsUrl(value: string): boolean {
  if (typeof value !== "string" || value.length > 2048) return false;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    if (!url.hostname || url.hostname.includes(" ")) return false;
    return true;
  } catch {
    return false;
  }
}

export function sanitizePlainText(value: string, maxLen = 4000): string {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .slice(0, maxLen);
}
