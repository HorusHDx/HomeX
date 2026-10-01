"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  src: string;
  format: "hls" | "mp4";
  title: string;
  onEnded?: () => void;
  onError?: () => void;
}

export default function HlsPlayer({ src, format, title, onEnded, onError }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  const [starting, setStarting] = useState(true);

  useEffect(() => {
    setFailed(false);
    setStarting(true);
    const video = videoRef.current;
    if (!video || !src) return;

    let hls: import("hls.js").default | null = null;
    let cancelled = false;

    // Vigilante: algunas fuentes devuelven basura (p.ej. NSR sirve un PNG
    // donde va el segmento). Si en 18s no hay ni un frame, lo damos por
    // muerto para que el padre pruebe el siguiente servidor.
    const watchdog = setTimeout(() => {
      if (cancelled || video.readyState < 2) {
        setFailed(true);
        onError?.();
      }
    }, 18000);

    const boot = async () => {
      if (format === "mp4") {
        video.src = src;
        video.load();
        return;
      }

      const Hls = (await import("hls.js")).default;
      if (cancelled) return;

      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        // Safari reproduce HLS nativo: hls.js no hace falta ahí.
        video.src = src;
        return;
      }
      if (!Hls.isSupported()) {
        setFailed(true);
        onError?.();
        return;
      }

      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
        maxBufferLength: 30,
        // El playUrl de NSR ya llega con CORS; referer propio no estorba.
        xhrSetup: (xhr) => {
          xhr.withCredentials = false;
        },
      });
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => setStarting(false));
      hls.on(Hls.Events.ERROR, (_evt, data) => {
        if (!data.fatal) return;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls?.startLoad();
        else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls?.recoverMediaError();
        else {
          clearTimeout(watchdog);
          setFailed(true);
          onError?.();
        }
      });
    };

    void boot();
    return () => {
      cancelled = true;
      clearTimeout(watchdog);
      hls?.destroy();
    };
    // onError es un callback del padre: no lo queremos en las deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, format]);

  useEffect(() => {
    // Un stream que sí arrancó puede caerse a mitad: no esperamos al vigilante.
    if (failed) onError?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [failed]);

  return (
    <div className="hls-player">
      {failed ? (
        <div className="hls-error">
          <span>El stream se cortó</span>
          <button onClick={() => window.location.reload()}>Reintentar</button>
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            className="hls-video"
            controls
            playsInline
            preload="metadata"
            title={title}
            onCanPlay={() => setStarting(false)}
            onEnded={() => onEnded?.()}
          />
          {starting && <div className="hls-buf">Cargando stream…</div>}
        </>
      )}
    </div>
  );
}
