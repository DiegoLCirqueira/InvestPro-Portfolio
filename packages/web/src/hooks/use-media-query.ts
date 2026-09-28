import { useCallback, useSyncExternalStore } from "react";

// Abaixo do breakpoint `nav` (1120 px): layout de celular/tablet, com a barra de navegação inferior.
export const BELOW_NAV_QUERY = "(max-width: 1119.98px)";

export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (notify: () => void) => {
      const mediaQuery = window.matchMedia(query);
      mediaQuery.addEventListener("change", notify);
      return () => mediaQuery.removeEventListener("change", notify);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}
