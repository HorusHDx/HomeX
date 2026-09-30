import type { Metadata, Viewport } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Splash from "@/components/Splash";
import QuickViewProvider from "@/components/QuickView";

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
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
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
