/**
 * ReWorth design tokens — mobile source of truth (v1.0.3-design-elevation).
 * Keep in sync with packages/ui-web/src/tokens.css and docs/DESIGN.md.
 */

export const colors = {
  canvas: "#FAF9F7",
  surface: "#FFFFFF",
  ink: "#101418",
  muted: "#5C6470",
  border: "#E5E1DA",
  emerald: "#0E9F6E",
  emeraldPressed: "#0B7A55",
  emeraldWash: "#E6F6EF",
  gold: "#C9A227",
  goldWash: "#F5EDD0",
  success: "#12A150",
  warning: "#E8A13C",
  error: "#D64545",
} as const;

export const colorsDark = {
  canvas: "#0F1214",
  surface: "#171B1E",
  ink: "#F2F0EC",
  muted: "#9AA1A8",
  border: "#2A3036",
  emerald: "#12A170",
  emeraldPressed: "#0E9F6E",
  emeraldWash: "#064E3B",
  gold: "#E0B84A",
  goldWash: "#3D3418",
  success: "#17B87A",
  warning: "#FBBF24",
  error: "#F87171",
} as const;

export const type = {
  display: 28,
  title: 24,
  titleSm: 20,
  body: 17,
  bodySm: 15,
  meta: 13,
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 20,
  full: 999,
} as const;

export const motion = {
  microMs: 150,
  standardMs: 250,
} as const;

export const tap = {
  min: 44,
} as const;
