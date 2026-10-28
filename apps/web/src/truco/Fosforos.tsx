/**
 * Puntaje con fósforos, como se anota en la mesa: de a 5, cuatro haciendo un cuadrado y uno cruzado.
 * En la partida a 30, una línea separa las malas (primeros 15) de las buenas.
 */

function Fosforo({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  return (
    <g strokeLinecap="round">
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#5b3a1e" strokeWidth={3.4} />
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#e9c98e" strokeWidth={2} />
      <circle cx={x2} cy={y2} r={2.6} fill="#c0392b" stroke="#5b1a10" strokeWidth={0.8} />
    </g>
  );
}

/** Un cuadradito de hasta 5 fósforos (caja de 24×24). */
function Grupo({ n }: { n: number }) {
  const sticks = [
    { x1: 3, y1: 21, x2: 3, y2: 3 },
    { x1: 3, y1: 3, x2: 21, y2: 3 },
    { x1: 21, y1: 3, x2: 21, y2: 21 },
    { x1: 21, y1: 21, x2: 3, y2: 21 },
    { x1: 3, y1: 21, x2: 21, y2: 3 },
  ];
  return (
    <svg viewBox="0 0 24 24" className="size-6" aria-hidden>
      {sticks.slice(0, n).map((s, i) => (
        <Fosforo key={i} {...s} />
      ))}
    </svg>
  );
}

export function Fosforos({ puntos, target }: { puntos: number; target: number }) {
  const p = Math.min(puntos, target);
  const grupos = Math.ceil(target / 5);
  const render = (from: number, count: number) =>
    Array.from({ length: count }, (_, i) => {
      const g = from + i;
      return <Grupo key={g} n={Math.max(0, Math.min(5, p - g * 5))} />;
    });
  return (
    <div className="flex items-center gap-0.5" role="img" aria-label={`${puntos} puntos`}>
      {target === 30 ? (
        <>
          {render(0, 3)}
          <span className="mx-0.5 h-6 w-px bg-crema/50" title="Malas | Buenas" />
          {render(3, 3)}
        </>
      ) : (
        render(0, grupos)
      )}
    </div>
  );
}
