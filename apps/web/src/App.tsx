import { AnimatePresence, motion, MotionConfig } from "motion/react";
import { DeckContext } from "./cards/SpanishCard.tsx";
import { Ascenso } from "./ascenso/Ascenso.tsx";
import { Gira } from "./carrera/Gira.tsx";
import { ChanchoMesa } from "./chancho/ChanchoMesa.tsx";
import { ChanchoSetup } from "./chancho/ChanchoSetup.tsx";
import { GeneralaMesa } from "./generala/GeneralaMesa.tsx";
import { GeneralaSetup } from "./generala/GeneralaSetup.tsx";
import { Logros } from "./carrera/Logros.tsx";
import { CasitaMesa } from "./casita/CasitaMesa.tsx";
import { CasitaSetup } from "./casita/CasitaSetup.tsx";
import { ChinchonMesa } from "./chinchon/ChinchonMesa.tsx";
import { ChinchonSetup } from "./chinchon/ChinchonSetup.tsx";
import { EscobaMesa } from "./escoba/EscobaMesa.tsx";
import { EscobaSetup } from "./escoba/EscobaSetup.tsx";
import { Amigos } from "./online/Amigos.tsx";
import { Sala } from "./online/Sala.tsx";
import { TuttiMesa } from "./tutti/TuttiMesa.tsx";
import { TuttiSetup } from "./tutti/TuttiSetup.tsx";
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
  return r.name === "juego" ? `juego-${r.id}` : r.name === "gira" ? `gira-${r.game}` : r.name === "ascenso" ? `ascenso-${r.game}` : r.name === "sala" ? `sala-${r.codigo}` : r.name;
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
    case "escoba-setup":
      return <EscobaSetup />;
    case "escoba-mesa":
      return <EscobaMesa />;
    case "generala-setup":
      return <GeneralaSetup />;
    case "generala-mesa":
      return <GeneralaMesa />;
    case "chancho-setup":
      return <ChanchoSetup />;
    case "chancho-mesa":
      return <ChanchoMesa />;
    case "tutti-setup":
      return <TuttiSetup />;
    case "tutti-mesa":
      return <TuttiMesa />;
    case "gira":
      return <Gira game={route.game} />;
    case "ascenso":
      return <Ascenso game={route.game} />;
    case "amigos":
      return <Amigos game={route.game} />;
    case "sala":
      return <Sala codigo={route.codigo} game={route.game} />;
    case "logros":
      return <Logros />;
  }
}

function Shell() {
  const { route } = useNav();
  const { save } = useSave();
  return (
    <DeckContext.Provider value={save.ajustes.mazo}>
      {/* Respeta "reducir movimiento" del sistema, o el ajuste propio. */}
      <MotionConfig reducedMotion={save.ajustes.menosAnimaciones ? "always" : "user"}>
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
      </MotionConfig>
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
