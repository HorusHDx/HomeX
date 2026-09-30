import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Splash from "@/components/Splash";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "800", "900"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://home-x-jet.vercel.app"),
  title: {
    default: "HomeX - Streaming",
    template: "%s | HomeX",
  },
  description: "HomeX: películas, series y anime para ver online. Catálogo, tendencias y episodios recientes.",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "es_ES",
    siteName: "HomeX",
    title: "HomeX - Streaming",
    description: "Películas, series y anime para ver online.",
  },
  twitter: {
    card: "summary_large_image",
    title: "HomeX - Streaming",
    description: "Películas, series y anime para ver online.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#050608",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={inter.className}>
      <body>
        <Splash />
        <Navbar />
        <main className="main">{children}</main>
        <footer className="foot">
          <span className="logo" style={{ fontSize: "1rem" }}>
            <b>HOME</b>
            <i>X</i>
          </span>
          <span>
            HomeX no aloja ningún video. Todo el contenido es proporcionado por terceros no afiliados. Datos e imágenes de TMDB, sin aval de TMDB.
          </span>
        </footer>
      </body>
    </html>
  );
}
