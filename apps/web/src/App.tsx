import { AnimatePresence, motion } from "motion/react";
import { deckDisponible } from "./cards/decks.ts";
import { DeckContext } from "./cards/SpanishCard.tsx";
import { Gira } from "./carrera/Gira.tsx";
import { Logros } from "./carrera/Logros.tsx";
import { CasitaMesa } from "./casita/CasitaMesa.tsx";
import { CasitaSetup } from "./casita/CasitaSetup.tsx";
import { ChinchonMesa } from "./chinchon/ChinchonMesa.tsx";
import { ChinchonSetup } from "./chinchon/ChinchonSetup.tsx";
import { NavProvider, useNav, type Route } from "./nav.tsx";
import { SaveProvider, useSave } from "./save/SaveContext.tsx";
import { Ajustes } from "./screens/Ajustes.tsx";
import { Inicio } from "./screens/Inicio.tsx";
import { Juego } from "./screens/Juego.tsx";
import { Juegos } from "./screens/Juegos.tsx";
import { Mazos } from "./screens/Mazos.tsx";
import { Perfil } from "./screens/Perfil.tsx";
import { TrucoMesa } from "./truco/TrucoMesa.tsx";
import { TrucoSetup } from "./truco/TrucoSetup.tsx";

function routeKey(r: Route): string {
  return r.name === "juego" ? `juego-${r.id}` : r.name === "gira" ? `gira-${r.game}` : r.name;
}

function CurrentScreen({ route }: { route: Route }) {
  switch (route.name) {
    case "inicio":
      return <Inicio />;
    case "juegos":
      return <Juegos />;
    case "juego":
      return <Juego id={route.id} />;
    case "perfil":
      return <Perfil bienvenida={route.bienvenida ?? false} />;
    case "ajustes":
      return <Ajustes />;
    case "mazos":
      return <Mazos />;
    case "truco-setup":
      return <TrucoSetup />;
    case "truco-mesa":
      return <TrucoMesa />;
    case "chinchon-setup":
      return <ChinchonSetup />;
    case "chinchon-mesa":
      return <ChinchonMesa />;
    case "casita-setup":
      return <CasitaSetup />;
    case "casita-mesa":
      return <CasitaMesa />;
    case "gira":
      return <Gira game={route.game} />;
    case "logros":
      return <Logros />;
  }
}

function Shell() {
  const { route } = useNav();
  const { save } = useSave();
  return (
    <DeckContext.Provider value={deckDisponible(save.ajustes.mazo, save.carrera) ? save.ajustes.mazo : "criolla"}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={routeKey(route)}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.16 }}
        >
          <CurrentScreen route={route} />
        </motion.div>
      </AnimatePresence>
    </DeckContext.Provider>
  );
}

export function App() {
  return (
    <SaveProvider>
      <NavProvider>
        <Shell />
      </NavProvider>
    </SaveProvider>
  );
}
