import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Galf",
    short_name: "Galf",
    description: "Anotador de golf para el grupo",
    start_url: "/",
    display: "standalone",
    lang: "es-AR",
    background_color: "#f6f7f4",
    theme_color: "#1f7a4d",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
