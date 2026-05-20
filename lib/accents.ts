import type { AccentKey } from "@/lib/types";

export interface Accent {
  key: AccentKey;
  label: string;
  // oklch values tuned to read well on both light and dark neutral surfaces.
  color: string;
}

export const ACCENTS: Accent[] = [
  { key: "slate", label: "Slate", color: "oklch(0.62 0.03 257)" },
  { key: "blue", label: "Blue", color: "oklch(0.62 0.19 256)" },
  { key: "violet", label: "Violet", color: "oklch(0.61 0.22 293)" },
  { key: "emerald", label: "Emerald", color: "oklch(0.66 0.16 162)" },
  { key: "amber", label: "Amber", color: "oklch(0.74 0.16 75)" },
  { key: "rose", label: "Rose", color: "oklch(0.64 0.21 14)" },
  { key: "cyan", label: "Cyan", color: "oklch(0.68 0.13 215)" },
  { key: "fuchsia", label: "Fuchsia", color: "oklch(0.63 0.25 322)" },
];

const BY_KEY = new Map(ACCENTS.map((a) => [a.key, a]));

export function accentColor(key: AccentKey): string {
  return (BY_KEY.get(key) ?? ACCENTS[0]).color;
}

export const DEFAULT_ACCENT: AccentKey = "slate";
