/** Shareable COP view: theater jump + live overlay keys in the URL. */

export const COP_LAYER_KEYS = [
  "firms",
  "satellites",
  "adsb",
  "quakes",
  "ais",
  "launches",
  "acled",
] as const;

export type CopLayerKey = (typeof COP_LAYER_KEYS)[number];

export type CopView = {
  ao?: string;
  layers?: CopLayerKey[];
};

function isCopLayerKey(value: string): value is CopLayerKey {
  return (COP_LAYER_KEYS as readonly string[]).includes(value);
}

export function parseCopView(search: string): CopView {
  const raw = search.startsWith("?") ? search.slice(1) : search;
  const p = new URLSearchParams(raw);
  const ao = p.get("ao")?.trim() || undefined;
  const l = p.get("l");
  const layers = l
    ? l
        .split(",")
        .map((s) => s.trim())
        .filter(isCopLayerKey)
    : undefined;
  return {
    ao: ao || undefined,
    layers: layers?.length ? layers : undefined,
  };
}

export function serializeCopView(input: CopView): string {
  const p = new URLSearchParams();
  if (input.ao) p.set("ao", input.ao);
  if (input.layers?.length) p.set("l", input.layers.join(","));
  return p.toString();
}
