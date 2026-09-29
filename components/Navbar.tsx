"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/90 to-transparent">
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-4">
        <Link href="/" className="text-2xl font-bold text-brand">
          HomeX
        </Link>
        <div className="flex gap-4 text-sm">
          <Link href="/" className="hover:text-gray-300">
            Inicio
          </Link>
          <Link href="/genre/movie" className="hover:text-gray-300">
            Películas
          </Link>
          <Link href="/genre/tv" className="hover:text-gray-300">
            Series
          </Link>
        </div>
        <form onSubmit={handleSearch} className="ml-auto">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar..."
            className="rounded bg-black/60 px-3 py-1.5 text-sm outline-none ring-1 ring-white/20 focus:ring-white/50"
          />
        </form>
      </div>
    </nav>
  );
}
