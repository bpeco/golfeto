import type { Metadata, Viewport } from "next";
import { Sofia_Sans, Sofia_Sans_Extra_Condensed } from "next/font/google";
import { THEME_HEX } from "@/lib/theme-colors";
import { startupImages } from "@/lib/pwa/devices";
import { Providers } from "./providers";
import "./globals.css";

// Tipografía A (Puerta 1, provisional): una superfamilia, dos anchos. Texto humanista y
// numerales condensados para la pizarra, los golpes y el wordmark.
const text = Sofia_Sans({ variable: "--font-text", subsets: ["latin"], display: "swap" });
const numerals = Sofia_Sans_Extra_Condensed({
  variable: "--font-numerals",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Galf", template: "%s · Galf" },
  description: "Anotador de golf para el grupo: partidas, tarjetas y hándicap.",
  manifest: "/manifest.webmanifest",
  // statusBarStyle "default" (texto negro sobre barra clara): "black-translucent" dejaría el
  // reloj en blanco sobre el papel. Provisional hasta probarlo en un iPhone (ver DESIGN.md).
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Galf", startupImage: startupImages() },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: THEME_HEX.papel },
    { media: "(prefers-color-scheme: dark)", color: THEME_HEX.pizarra },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-AR" className={`${text.variable} ${numerals.variable} h-full`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
