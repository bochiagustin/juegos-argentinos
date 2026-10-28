import type { CareerGame } from "@juegos-argentinos/career";
import type { GameId } from "@juegos-argentinos/engine";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

export type Route =
  | { name: "inicio" }
  | { name: "juegos" }
  | { name: "juego"; id: GameId }
  | { name: "perfil"; bienvenida?: boolean }
  | { name: "ajustes" }
  | { name: "mazos" }
  | { name: "truco-setup" }
  | { name: "truco-mesa" }
  | { name: "chinchon-setup" }
  | { name: "chinchon-mesa" }
  | { name: "casita-setup" }
  | { name: "casita-mesa" }
  | { name: "gira"; game: CareerGame }
  | { name: "logros" };

interface Nav {
  route: Route;
  depth: number;
  push: (r: Route) => void;
  /** Reemplaza la pantalla actual (ej. después de la bienvenida). */
  replace: (r: Route) => void;
  back: () => void;
  /** Ir a una sección principal (pestañas): deja la pila en [inicio, destino]. */
  goTo: (r: Route) => void;
}

const NavContext = createContext<Nav | null>(null);

/**
 * Navegación por pila, sin router. Cada push agrega una entrada al historial del navegador
 * para que el botón "atrás" de Android funcione como se espera.
 */
export function NavProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<Route[]>([{ name: "inicio" }]);
  const stackRef = useRef(stack);
  stackRef.current = stack;
  // La pila interna manda; el historial del navegador es un extra (en algunos visores embebidos no está disponible).
  const historyOk = useRef(true);
  const ignorePops = useRef(0);

  const tryHistory = useCallback((fn: () => void) => {
    if (!historyOk.current) return;
    try {
      fn();
    } catch {
      historyOk.current = false;
    }
  }, []);

  useEffect(() => {
    tryHistory(() => history.replaceState({ depth: 0 }, ""));
    const onPop = (e: PopStateEvent) => {
      if (ignorePops.current > 0) {
        ignorePops.current--;
        return;
      }
      // "Atrás" del navegador o del celular.
      const depth = typeof e.state?.depth === "number" ? e.state.depth : 0;
      setStack((s) => s.slice(0, Math.max(1, depth + 1)));
    };
    addEventListener("popstate", onPop);
    return () => removeEventListener("popstate", onPop);
  }, [tryHistory]);

  const push = useCallback(
    (r: Route) => {
      tryHistory(() => history.pushState({ depth: stackRef.current.length }, ""));
      setStack((s) => [...s, r]);
    },
    [tryHistory],
  );

  const replace = useCallback((r: Route) => setStack((s) => [...s.slice(0, -1), r]), []);

  const back = useCallback(() => {
    if (stackRef.current.length <= 1) return;
    setStack((s) => s.slice(0, -1));
    tryHistory(() => {
      ignorePops.current++;
      history.back();
    });
  }, [tryHistory]);

  const goTo = useCallback(
    (r: Route) => {
      const depth = stackRef.current.length;
      if (r.name === "inicio") {
        setStack([{ name: "inicio" }]);
        if (depth > 1)
          tryHistory(() => {
            ignorePops.current++;
            history.go(-(depth - 1));
          });
        return;
      }
      tryHistory(() => (depth === 1 ? history.pushState({ depth: 1 }, "") : history.replaceState({ depth: 1 }, "")));
      setStack([{ name: "inicio" }, r]);
    },
    [tryHistory],
  );

  const route = stack[stack.length - 1] ?? { name: "inicio" };
  return <NavContext.Provider value={{ route, depth: stack.length, push, replace, back, goTo }}>{children}</NavContext.Provider>;
}

export function useNav(): Nav {
  const ctx = useContext(NavContext);
  if (!ctx) throw new Error("useNav tiene que usarse dentro de <NavProvider>");
  return ctx;
}
