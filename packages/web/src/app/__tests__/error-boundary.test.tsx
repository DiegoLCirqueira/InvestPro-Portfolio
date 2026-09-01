import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ErrorBoundary } from "@/app/ErrorBoundary";

function Bomb(): ReactNode {
  throw new Error("falha catastrófica no componente filho");
}

describe("ErrorBoundary", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renderiza os filhos normalmente quando não há erro", () => {
    render(
      <ErrorBoundary>
        <div>Conteúdo saudável</div>
      </ErrorBoundary>,
    );
    expect(screen.getByText("Conteúdo saudável")).toBeInTheDocument();
  });

  it("captura o erro do filho e exibe o fallback", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Algo deu errado")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Ocorreu um erro inesperado. Tente novamente ou volte para a página inicial.",
      ),
    ).toBeInTheDocument();
    expect(spy).toHaveBeenCalled();
  });

  it("exibe ação de tentar novamente no fallback", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Tentar novamente")).toBeInTheDocument();
    expect(screen.getByText("Voltar ao início")).toBeInTheDocument();
  });
});