import { useRef } from "react";
import type { FormEvent } from "react";

/**
 * Handler de submit que roda `submit` no máximo uma vez por vez. A trava é um
 * ref (síncrona): cliques no mesmo tick chegam antes de qualquer re-render,
 * então `disabled={isPending}` sozinho não impede envio duplicado de dinheiro.
 * Sempre chama preventDefault: um submit ignorado não pode virar navegação nativa.
 */
export function useSubmitOnce(submit: () => Promise<void>) {
  const isSubmitting = useRef(false);

  return async (event: FormEvent) => {
    event.preventDefault();
    if (isSubmitting.current) return;

    isSubmitting.current = true;
    try {
      await submit();
    } finally {
      isSubmitting.current = false;
    }
  };
}
