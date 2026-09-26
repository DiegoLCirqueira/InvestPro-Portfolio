import { useEffect, useState } from "react";
import type { RefObject } from "react";

export interface ScrollEdges {
  /** Há conteúdo escondido acima do que está visível. */
  above: boolean;
  /** Há conteúdo escondido abaixo do que está visível. */
  below: boolean;
}

// Diz de que lado a área rolável tem conteúdo escondido. Serve para esmaecer
// só essas bordas (sinaliza "role para ver mais") em vez de cortar um item ao
// meio; cada lado some quando a pessoa chega àquela ponta da lista.
export function useScrollEdges(
  ref: RefObject<HTMLElement | null>,
  deps: readonly unknown[] = [],
): ScrollEdges {
  const [edges, setEdges] = useState<ScrollEdges>({ above: false, below: false });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const update = () => {
      const above = element.scrollTop > 1;
      const below = element.scrollHeight - element.scrollTop - element.clientHeight > 1;
      setEdges((current) =>
        current.above === above && current.below === below ? current : { above, below },
      );
    };

    update();
    element.addEventListener("scroll", update, { passive: true });
    const resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    resizeObserver?.observe(element);

    return () => {
      element.removeEventListener("scroll", update);
      resizeObserver?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps: conteúdo que muda a altura
  }, [ref, ...deps]);

  return edges;
}

const FADE = "48px";

/** mask-image que esmaece só as bordas com conteúdo escondido. */
export function scrollEdgesMask({ above, below }: ScrollEdges): string | undefined {
  if (!above && !below) return undefined;
  const top = above ? `transparent, black ${FADE}` : "black";
  const bottom = below ? `black calc(100% - ${FADE}), transparent` : "black";
  return `linear-gradient(to bottom, ${top}, ${bottom})`;
}
