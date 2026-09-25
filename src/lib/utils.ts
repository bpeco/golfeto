import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// tailwind-merge no conoce los tokens propios: sin esto, `text-numeral` (tamaño) y
// `text-board-foreground` (color) se pisarían entre sí, y `h-tap` no reemplazaría a `h-10`.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["numeral", "numeral-lg", "numeral-xl", "numeral-2xl"] }],
    },
    theme: {
      spacing: ["tap", "thumb"],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
