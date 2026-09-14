#!/usr/bin/env node
/**
 * Contrast audit — token pairs must meet WCAG AA.
 * Normal text ≥ 4.5:1; large/bold CTA label ≥ 3:1.
 * Usage: node scripts/contrast-audit.mjs
 */
const pairs = [
  { name: "ink on canvas", fg: "#101418", bg: "#FAF9F7", min: 4.5 },
  { name: "muted on canvas", fg: "#5C6470", bg: "#FAF9F7", min: 4.5 },
  { name: "ink on surface", fg: "#101418", bg: "#FFFFFF", min: 4.5 },
  { name: "white on emerald (CTA large)", fg: "#FFFFFF", bg: "#0E9F6E", min: 3 },
  { name: "emerald on wash", fg: "#0B7A55", bg: "#E6F6EF", min: 4.5 },
  { name: "dark ink on dark canvas", fg: "#F2F0EC", bg: "#0F1214", min: 4.5 },
  { name: "dark muted on dark canvas", fg: "#9AA1A8", bg: "#0F1214", min: 4.5 },
  {
    name: "white on dark emerald (CTA large)",
    fg: "#FFFFFF",
    bg: "#12A170",
    min: 3,
  },
];

function lum(hex) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const f = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function ratio(a, b) {
  const L1 = lum(a);
  const L2 = lum(b);
  const hi = Math.max(L1, L2);
  const lo = Math.min(L1, L2);
  return (hi + 0.05) / (lo + 0.05);
}

let failed = 0;
for (const { name, fg, bg, min } of pairs) {
  const r = ratio(fg, bg);
  const ok = r >= min;
  console.log(
    `${ok ? "PASS" : "FAIL"} ${name}: ${r.toFixed(2)}:1 (min ${min})`,
  );
  if (!ok) failed += 1;
}

if (failed) {
  console.error(`\n${failed} pair(s) below target`);
  process.exit(1);
}
console.log("\nAll token pairs meet targets");
