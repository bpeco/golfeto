/**
 * Hex de los tokens para lo que no lee CSS: <meta name="theme-color">, manifest, íconos y
 * splash (ImageResponse). Salen de `pnpm contrast -- --json`; si cambia globals.css, regenerar.
 */
export const THEME_HEX = {
  /** --papel / --background claro */
  papel: "#f5f7f1",
  /** --pizarra / --background oscuro */
  pizarra: "#111b15",
  /** --tinta */
  tinta: "#17221c",
  /** --pasto / --primary claro */
  pasto: "#0b7643",
  /** --board claro: el verde profundo de la pizarra */
  board: "#143525",
  /** --rojo: la lapicera del birdie */
  rojo: "#c9302d",
  /** --score-under oscuro: rojo legible sobre pizarra */
  rojoClaro: "#ff7a73",
} as const;
