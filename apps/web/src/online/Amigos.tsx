import type { GameId } from "@juegos-argentinos/engine";
import { useState } from "react";
import { playSfx } from "../audio/sfx.ts";
import { gameInfo } from "../games.ts";
import { useNav } from "../nav.tsx";
import { BigButton, Screen, Section } from "../ui/ui.tsx";
import { codigoNuevo, servidorSalas } from "./conexion.ts";

const LETRAS = "ABCDEFGHJKLMNPQRSTUVWXYZ";

/** Jugar con amigos: armar una sala nueva o entrar con un código. */
export function Amigos({ game }: { game?: GameId | undefined }) {
  const { back, push } = useNav();
  const [codigo, setCodigo] = useState("");
  const servidor = servidorSalas();
  const valido = codigo.length === 5;

  return (
    <Screen title="Con amigos" onBack={back}>
      {!servidor && (
        <div className="cuero cuero-rojo mb-4 rounded-2xl p-4">
          <p className="relative z-[1] text-sm font-semibold">
            Para jugar online hace falta el servidor de salas. Si ya lo tenés andando, cargá su dirección en <b>Ajustes → Online</b>.
          </p>
          <button className="relative z-[1] mt-2 text-sm font-black underline" onClick={() => push({ name: "ajustes" })}>
            Ir a Ajustes
          </button>
        </div>
      )}
      <Section title="Armar una sala">
        <p className="px-1 text-sm text-crema/85">
          Creás la sala{game ? ` de ${gameInfo(game).nombre}` : ""}, les pasás el código por WhatsApp y cuando estén todos arrancan. Si faltan jugadores, completás con la máquina.
        </p>
        <BigButton
          disabled={!servidor}
          onClick={() => {
            playSfx("click");
            push({ name: "sala", codigo: codigoNuevo(), ...(game ? { game } : {}) });
          }}
        >
          Crear sala
        </BigButton>
      </Section>
      <Section title="Entrar con un código">
        <div className="cuero rounded-2xl p-3">
          <div className="relative z-[1] flex gap-2">
            <input
              value={codigo}
              onChange={(e) =>
                setCodigo(
                  e.target.value
                    .toUpperCase()
                    .split("")
                    .filter((l) => LETRAS.includes(l))
                    .join("")
                    .slice(0, 5),
                )
              }
              onKeyDown={(e) => e.key === "Enter" && valido && servidor && push({ name: "sala", codigo })}
              placeholder="ABCDE"
              aria-label="Código de la sala"
              autoCapitalize="characters"
              autoComplete="off"
              className="min-h-14 min-w-0 flex-1 rounded-xl bg-crema px-4 text-center font-criolla text-3xl tracking-[0.3em] text-tinta placeholder:text-tinta/30"
            />
          </div>
        </div>
        <BigButton variant="secundario" disabled={!valido || !servidor} onClick={() => push({ name: "sala", codigo })}>
          Entrar
        </BigButton>
      </Section>
    </Screen>
  );
}
