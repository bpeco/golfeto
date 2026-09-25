/**
 * Color del tee a partir de su nombre ("Blancas", "Azul", "amarillas"…). Los tees se cargan con
 * texto libre; esto reconoce los colores habituales en Argentina y deja el resto sin color.
 */
export type TeeColor = "blancas" | "azules" | "amarillas" | "rojas" | "negras" | "verdes";

const PATTERNS: [RegExp, TeeColor][] = [
  [/^blanc/, "blancas"],
  [/^azul/, "azules"],
  [/^(amarill|dorad)/, "amarillas"],
  [/^roj/, "rojas"],
  [/^negr/, "negras"],
  [/^verd/, "verdes"],
];

export function teeColor(name: string): TeeColor | null {
  const n = name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  return PATTERNS.find(([re]) => re.test(n))?.[1] ?? null;
}

/** Clase de fondo del punto de color (tokens --tee-*). El blanco lleva borde de tinta. */
export const TEE_DOT_CLASS: Record<TeeColor, string> = {
  blancas: "bg-tee-blancas ring-1 ring-inset ring-foreground/60",
  azules: "bg-tee-azules",
  amarillas: "bg-tee-amarillas ring-1 ring-inset ring-foreground/20",
  rojas: "bg-tee-rojas",
  negras: "bg-tee-negras ring-1 ring-inset ring-foreground/30",
  verdes: "bg-tee-verdes",
};
