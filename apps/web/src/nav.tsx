import type { GameId } from "@juegos-argentinos/engine";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

export type Route =
  | { name: "inicio" }
  | { name: "juegos" }
  | { name: "juego"; id: GameId }
  | { name: "perfil"; bienvenida?: boolean }
  | { name: "ajustes" }
  | { name: "mazos" };

interface Nav {
  route: Route;
  depth: number;
  push: (r: Route) => void;
  /** Reemplaza la pantalla actual (ej. después de la bienvenida). */
  replace: (r: Route) => void;
  back: () => void;
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

  useEffect(() => {
    history.replaceState({ depth: 0 }, "");
    const onPop = (e: PopStateEvent) => {
      const depth = typeof e.state?.depth === "number" ? e.state.depth : 0;
      setStack((s) => s.slice(0, Math.max(1, depth + 1)));
    };
    addEventListener("popstate", onPop);
    return () => removeEventListener("popstate", onPop);
  }, []);

  const push = useCallback((r: Route) => {
    history.pushState({ depth: stackRef.current.length }, "");
    setStack((s) => [...s, r]);
  }, []);

  const replace = useCallback((r: Route) => setStack((s) => [...s.slice(0, -1), r]), []);

  const back = useCallback(() => {
    if (stackRef.current.length > 1) history.back();
  }, []);

  const route = stack[stack.length - 1] ?? { name: "inicio" };
  return <NavContext.Provider value={{ route, depth: stack.length, push, replace, back }}>{children}</NavContext.Provider>;
}

export function useNav(): Nav {
  const ctx = useContext(NavContext);
  if (!ctx) throw new Error("useNav tiene que usarse dentro de <NavProvider>");
  return ctx;
}
