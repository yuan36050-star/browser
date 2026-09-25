/** Liquid Glass intensity → CSS variables read by every glass layer. */

export const GLASS_MIN = 0.35;
export const GLASS_MAX = 0.85;
export const GLASS_PRESETS = { jelly: 0.35, balanced: 0.62, solid: 0.85 } as const;
export type GlassPreset = keyof typeof GLASS_PRESETS;

export function clampGlass(a: number): number {
  return Math.min(GLASS_MAX, Math.max(GLASS_MIN, Number.isFinite(a) ? a : GLASS_PRESETS.balanced));
}

export function presetFor(a: number): GlassPreset | '' {
  const hit = (Object.keys(GLASS_PRESETS) as GlassPreset[]).find((k) => Math.abs(GLASS_PRESETS[k] - a) < 0.015);
  return hit ?? '';
}

export function applyGlass(value: number) {
  const a = clampGlass(value);
  const root = document.documentElement.style;
  root.setProperty('--glass-alpha', a.toFixed(3));
  // Dark glass tracks the same intensity, a touch clearer (0.55 at the balanced default).
  root.setProperty('--glass-alpha-d', Math.max(0.28, a - 0.07).toFixed(3));
  // Sheets and menus carry text, so they sit closer to solid at every intensity.
  root.setProperty('--glass-alpha-strong', (a + (1 - a) * 0.45).toFixed(3));
  root.setProperty('--glass-alpha-strong-d', (a - 0.07 + (1 - a) * 0.45).toFixed(3));
}
