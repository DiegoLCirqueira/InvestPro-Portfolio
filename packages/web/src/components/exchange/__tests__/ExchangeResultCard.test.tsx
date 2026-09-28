import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ExchangeResultCard } from "@/components/exchange/ExchangeResultCard";
import type { ExchangeSummary } from "@/types/exchange";

const summary: ExchangeSummary = {
  from: "BRL",
  to: "USD",
  amount: 10,
  convertedAmount: 1.93,
  rate: 0.1944,
  fee: 0.1,
  at: "2026-09-19T15:16:09.000Z",
};

describe("ExchangeResultCard", () => {
  it("simulação: rótulos no futuro e cotação com vírgula e 4 casas (pt-BR)", () => {
    const { container } = render(<ExchangeResultCard variant="simulation" summary={summary} />);
    const text = container.textContent ?? "";

    expect(text).toContain("Simulação");
    expect(text).toContain("Você enviará");
    expect(text).toContain("Você receberá (estimado)");
    expect(text).toContain("0,1944");
    expect(text).not.toContain("0.1944");
  });

  it("confirmação: rótulos no passado e valores em cada moeda", () => {
    const { container } = render(<ExchangeResultCard variant="confirmation" summary={summary} />);
    const text = container.textContent ?? "";

    expect(text).toContain("Conversão realizada");
    expect(text).toContain("Você enviou");
    expect(text).toContain("Você recebeu");
    expect(text).toMatch(/R\$\s10,00/);
    expect(text).toMatch(/US\$\s1,93/);
  });
});

describe("ExchangeResultCard no celular (resultado abaixo da dobra)", () => {
  const mockViewport = (isMobile: boolean) =>
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query.includes("max-width") ? isMobile : false,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));

  afterEach(() => vi.unstubAllGlobals());

  it("no celular, a simulação recebe o foco no título ao aparecer", () => {
    mockViewport(true);
    render(<ExchangeResultCard variant="simulation" summary={summary} revealOnMobile />);
    expect(screen.getByRole("heading", { name: "Simulação" })).toHaveFocus();
  });

  it("no desktop nada rola nem rouba o foco", () => {
    mockViewport(false);
    render(<ExchangeResultCard variant="simulation" summary={summary} revealOnMobile />);
    expect(screen.getByRole("heading", { name: "Simulação" })).not.toHaveFocus();
  });

  it("a confirmação (depois de Realizar conversão) não rouba o foco", () => {
    mockViewport(true);
    render(<ExchangeResultCard variant="confirmation" summary={summary} />);
    expect(screen.getByRole("heading", { name: /Conversão realizada/ })).not.toHaveFocus();
  });
});
