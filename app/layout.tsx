import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import SplashScreen from "@/components/SplashScreen";
import BottomNav from "@/components/BottomNav";

export const metadata: Metadata = {
  title: "HomeX - Streaming",
  description: "Tu plataforma de streaming personal",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <SplashScreen />
        <Navbar />
        <main className="main">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
