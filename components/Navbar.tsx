"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const LINKS = [
  {
    href: "/",
    label: "Inicio",
    active: (p: string) => p === "/",
    icon: <path d="M3 11 12 4l9 7v9H3z" />,
  },
  {
    href: "/genre/movie",
    label: "Películas",
    active: (p: string) => p === "/genre/movie",
    icon: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M3 9h18" />
      </>
    ),
  },
  {
    href: "/genre/tv",
    label: "Series",
    active: (p: string) => p === "/genre/tv",
    icon: (
      <>
        <rect x="3" y="5" width="18" height="12" rx="2" />
        <path d="M8 21h8" />
      </>
    ),
  },
  {
    href: "/historial",
    label: "Historial",
    active: (p: string) => p === "/historial",
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
  },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const lastY = useRef(0);

  const solid = scrolled || pathname !== "/";

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 40);
      // Oculta al bajar, muestra al subir (cinemático)
      if (y > 300 && y > lastY.current + 4) setHidden(true);
      else if (y < lastY.current - 4 || y < 300) setHidden(false);
      lastY.current = y;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      if (e.key === "/" && !(el && /INPUT|TEXTAREA/.test(el.tagName))) {
        e.preventDefault();
        setOpen(true);
        input.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const toggleSearch = () => {
    setOpen(true);
    input.current?.focus();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = term.trim();
    if (!q) return;
    router.push(`/search?q=${encodeURIComponent(q)}`);
    input.current?.blur();
    setTerm("");
    setOpen(false);
  };

  return (
    <>
      <header className={`header${solid ? " solid" : ""}${hidden ? " hide" : ""}`}>
        <Link href="/" className="logo" aria-label="HomeX — inicio">
          <b>HOME</b>
          <i>X</i>
        </Link>

        <nav className="nav" aria-label="Principal">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={l.active(pathname) ? "active" : ""}>
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="header-right">
          <form
            className={`search${open ? " open" : ""}`}
            onSubmit={handleSearch}
            role="search"
          >
            <button type="button" className="search-btn" onClick={toggleSearch} aria-label="Buscar">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            </button>
            <input
              ref={input}
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              onFocus={() => setOpen(true)}
              onBlur={() => !term && setOpen(false)}
              placeholder="Títulos, géneros…"
              aria-label="Buscar títulos"
            />
          </form>
        </div>
      </header>

      <nav className="bottom-nav" aria-label="Navegación móvil">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className={l.active(pathname) ? "active" : ""}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {l.icon}
            </svg>
            {l.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
