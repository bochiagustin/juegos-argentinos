import { AnimatePresence, motion } from "motion/react";
import { DeckContext } from "./cards/SpanishCard.tsx";
import { NavProvider, useNav, type Route } from "./nav.tsx";
import { SaveProvider, useSave } from "./save/SaveContext.tsx";
import { Ajustes } from "./screens/Ajustes.tsx";
import { Inicio } from "./screens/Inicio.tsx";
import { Juego } from "./screens/Juego.tsx";
import { Juegos } from "./screens/Juegos.tsx";
import { Mazos } from "./screens/Mazos.tsx";
import { Perfil } from "./screens/Perfil.tsx";

function routeKey(r: Route): string {
  return r.name === "juego" ? `juego-${r.id}` : r.name;
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
  }
}

function Shell() {
  const { route } = useNav();
  const { save } = useSave();
  return (
    <DeckContext.Provider value={save.ajustes.mazo}>
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
