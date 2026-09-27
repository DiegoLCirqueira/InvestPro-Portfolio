import { afterEach, describe, expect, it, vi } from "vitest";
import { handleStaleChunk } from "@/app/stale-chunk-reload";

function preloadErrorEvent() {
  return new Event("vite:preloadError", { cancelable: true });
}

afterEach(() => {
  sessionStorage.clear();
  vi.restoreAllMocks();
});

describe("Recarga após deploy (chunk antigo inexistente)", () => {
  it("recarrega a página e impede que o erro chegue à tela", () => {
    const reload = vi.fn();
    const event = preloadErrorEvent();

    handleStaleChunk(event, reload, 100_000);

    expect(reload).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
  });

  it("não recarrega de novo se a falha se repetir logo depois (evita loop)", () => {
    const reload = vi.fn();
    handleStaleChunk(preloadErrorEvent(), reload, 100_000);

    const second = preloadErrorEvent();
    handleStaleChunk(second, reload, 105_000);

    expect(reload).toHaveBeenCalledTimes(1);
    expect(second.defaultPrevented).toBe(false);
  });

  it("volta a recarregar depois do intervalo de segurança", () => {
    const reload = vi.fn();
    handleStaleChunk(preloadErrorEvent(), reload, 100_000);
    handleStaleChunk(preloadErrorEvent(), reload, 111_000);

    expect(reload).toHaveBeenCalledTimes(2);
  });

  it("sem sessionStorage não recarrega, para não entrar em loop", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("bloqueado");
    });
    const reload = vi.fn();
    const event = preloadErrorEvent();

    handleStaleChunk(event, reload, 100_000);

    expect(reload).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });
});
