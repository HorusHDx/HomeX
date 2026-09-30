"use client";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="state">
      <h3>Algo salió mal</h3>
      <p>No pudimos cargar este contenido. Revisa tu conexión e inténtalo de nuevo.</p>
      <button className="btn btn-primary" onClick={() => reset()}>
        Reintentar
      </button>
    </div>
  );
}
