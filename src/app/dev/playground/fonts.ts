// Opciones B y C de la tipografía (Puerta 1). Solo las carga el playground; la app usa la A.
import { Archivo, Big_Shoulders, Public_Sans } from "next/font/google";

export const archivo = Archivo({ subsets: ["latin"], axes: ["wdth"], display: "swap" });
export const publicSans = Public_Sans({ subsets: ["latin"], display: "swap" });
export const bigShoulders = Big_Shoulders({ subsets: ["latin"], weight: ["700"], display: "swap", adjustFontFallback: false });
