import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Splash from "@/components/Splash";
import QuickViewProvider from "@/components/QuickView";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "800", "900"],
});

export const metadata: Metadata = {
  title: "HomeX - Streaming",
  description: "Tu plataforma de streaming personal",
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
        <QuickViewProvider>
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
        </QuickViewProvider>
      </body>
    </html>
  );
}
