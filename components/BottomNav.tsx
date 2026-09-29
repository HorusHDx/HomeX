"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bn" aria-label="Navegación principal">
      <Link href="/" className={pathname === "/" ? "on" : ""}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 11 12 4l9 7v9H3z" />
        </svg>
        Inicio
      </Link>
      <Link href="/genre/movie" className={pathname === "/genre/movie" ? "on" : ""}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M3 9h18" />
        </svg>
        Películas
      </Link>
      <Link href="/genre/tv" className={pathname === "/genre/tv" ? "on" : ""}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="5" width="18" height="12" rx="2" />
          <path d="M8 21h8" />
        </svg>
        Series
      </Link>
      <Link href="/historial" className={pathname === "/historial" ? "on" : ""}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
        Historial
      </Link>
    </nav>
  );
}
