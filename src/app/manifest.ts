import type { MetadataRoute } from "next";
import { THEME_HEX } from "@/lib/theme-colors";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Galf",
    short_name: "Galf",
    description: "Anotador de golf para el grupo: partidas, tarjetas y hándicap.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    lang: "es-AR",
    dir: "ltr",
    // Android arma el splash con el ícono sobre este color: el mismo papel de la primera pantalla.
    background_color: THEME_HEX.papel,
    theme_color: THEME_HEX.papel,
    categories: ["sports"],
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [{ name: "Nueva partida", short_name: "Nueva", url: "/partidas/nueva", icons: [{ src: "/icons/192", sizes: "192x192", type: "image/png" }] }],
  };
}
