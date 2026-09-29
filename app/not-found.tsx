import Link from "next/link";

export default function NotFound() {
  return (
    <div className="page">
      <div className="state">
        <h3>404 — Página no encontrada</h3>
        <p>La página que buscas no existe o fue movida.</p>
        <Link href="/" className="btn btn-primary">
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
