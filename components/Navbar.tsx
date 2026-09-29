"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [term, setTerm] = useState("");

  const onHome = pathname === "/";
  const solid = scrolled || !onHome;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = term.trim();
    if (!q) return;
    router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <header className={`header${solid ? " solid" : ""}`}>
      <Link href="/" className="logo" aria-label="HomeX — inicio">
        Home<span>X</span>
      </Link>

      <nav className="nav">
        <Link href="/" className={pathname === "/" ? "active" : ""}>
          Inicio
        </Link>
        <Link href="/genre/movie" className={pathname === "/genre/movie" ? "active" : ""}>
          Películas
        </Link>
        <Link href="/genre/tv" className={pathname === "/genre/tv" ? "active" : ""}>
          Series
        </Link>
      </nav>

      <div className="header-right">
        <form className="search" onSubmit={handleSearch} role="search">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Buscar títulos…"
            aria-label="Buscar"
          />
        </form>
      </div>
    </header>
  );
}
