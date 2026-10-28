import { useState, type CSSProperties, type ReactNode } from "react";
import { ART, artUrl, type ArtId } from "./manifest.ts";

export interface ArtProps {
  id: ArtId;
  alt?: string;
  className?: string;
  style?: CSSProperties;
  /** Qué mostrar mientras no esté la ilustración. Por defecto, un placeholder con la ruta esperada. */
  fallback?: ReactNode;
}

/** Ilustración del usuario con respaldo: si la imagen no carga, se ve el placeholder (o `fallback`). */
export function Art({ id, alt = "", className, style, fallback }: ArtProps) {
  const [failed, setFailed] = useState(false);
  if (failed) return <>{fallback ?? <ArtPlaceholder id={id} {...(className ? { className } : {})} />}</>;
  const spec = ART[id];
  return (
    <img
      src={artUrl(id)}
      alt={alt}
      width={spec.width}
      height={spec.height}
      className={className}
      style={style}
      draggable={false}
      onError={() => setFailed(true)}
    />
  );
}

export function ArtPlaceholder({ id, className }: { id: ArtId; className?: string }) {
  const spec = ART[id];
  return (
    <svg viewBox={`0 0 ${spec.width} ${spec.height}`} className={className} role="img" aria-label={`Falta la ilustración: ${spec.descripcion}`}>
      <rect width={spec.width} height={spec.height} fill="rgb(0 0 0 / 0.18)" />
      <rect x={8} y={8} width={spec.width - 16} height={spec.height - 16} fill="none" stroke="rgb(255 255 255 / 0.35)" strokeWidth={6} strokeDasharray="24 16" />
      <text x={spec.width / 2} y={spec.height / 2} textAnchor="middle" fontSize={Math.min(spec.width, spec.height) * 0.07} fill="rgb(255 255 255 / 0.7)" fontFamily="system-ui, sans-serif">
        {spec.path}
      </text>
    </svg>
  );
}
