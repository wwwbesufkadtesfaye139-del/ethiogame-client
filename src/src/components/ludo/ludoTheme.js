/**
 * ludoTheme.js — single source of truth for the Ludo palette.
 *
 * The two hex values per color (primary + glow) are copied verbatim from
 * the game spec. Everything else (dark shade, yard tone) is *derived* from
 * those two values at load time, so if the spec palette ever changes, only
 * these six lines need to change — nothing downstream is hand-tuned.
 */

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

function rgbToHex(r, g, b) {
  const c = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** Darken a hex color by `amount` (0-1). Used for shadows / depth, never for the base tone. */
function shade(hex, amount) {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(r * (1 - amount), g * (1 - amount), b * (1 - amount));
}

/** Blend a hex color toward black more aggressively — used for yard/base backgrounds. */
function deepen(hex, amount) {
  return shade(hex, amount);
}

const SPEC_COLORS = {
  red:    { primary: '#E53935', glow: '#FF6B6B' },
  green:  { primary: '#43A047', glow: '#7DFF9C' },
  yellow: { primary: '#FBC02D', glow: '#FFF176' },
  blue:   { primary: '#1E88E5', glow: '#64B5F6' },
};

export const LUDO_COLORS = Object.fromEntries(
  Object.entries(SPEC_COLORS).map(([name, { primary, glow }]) => [
    name,
    {
      main: primary,
      glow,
      light: glow, // the spec's "glow" doubles as the light/highlight tone
      dark: shade(primary, 0.38),
      yard: deepen(primary, 0.72),
    },
  ])
);

export const LUDO_PALETTE = {
  background: '#09131E', // Dark Navy
  card: '#152433',
  border: '#FFFFFF',
  grid: '#C9D2DE', // Light Gray, used at low opacity against the dark navy board
};

export const PLAYER_COLOR_ORDER = ['red', 'blue', 'green', 'yellow'];
