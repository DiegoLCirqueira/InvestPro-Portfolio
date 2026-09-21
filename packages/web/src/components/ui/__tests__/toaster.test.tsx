import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/toaster";

function stubMediaQuery(matches: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

async function toasterBottomOffset(): Promise<string> {
  render(<Toaster />);
  act(() => {
    toast("Mensagem de teste");
  });
  const toaster = await waitFor(() => {
    const element = document.querySelector<HTMLElement>("[data-sonner-toaster]");
    if (!element) throw new Error("toaster ainda não renderizou");
    return element;
  });
  return toaster.style.getPropertyValue("--offset-bottom");
}

describe("Toaster e a barra inferior", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    toast.dismiss();
  });

  it("com a barra inferior visível (mobile/tablet), o toast fica acima dela e da safe-area", async () => {
    stubMediaQuery(true);

    const offsetBottom = await toasterBottomOffset();

    expect(offsetBottom).toContain("var(--bottom-nav-height)");
    expect(offsetBottom).toContain("env(safe-area-inset-bottom)");
  });

  it("no desktop (sem barra inferior) mantém o deslocamento padrão", async () => {
    stubMediaQuery(false);

    const offsetBottom = await toasterBottomOffset();

    expect(offsetBottom).not.toContain("bottom-nav-height");
  });
});
