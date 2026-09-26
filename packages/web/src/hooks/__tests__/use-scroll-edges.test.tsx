import { useRef } from "react";
import { describe, expect, it } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { scrollEdgesMask, useScrollEdges } from "@/hooks/use-scroll-edges";

function Probe() {
  const ref = useRef<HTMLDivElement>(null);
  const edges = useScrollEdges(ref);
  return <div ref={ref} data-testid="list" data-above={String(edges.above)} data-below={String(edges.below)} />;
}

function scrollTo(element: HTMLElement, { scrollHeight, clientHeight, scrollTop }: Record<string, number>) {
  Object.defineProperty(element, "scrollHeight", { configurable: true, value: scrollHeight });
  Object.defineProperty(element, "clientHeight", { configurable: true, value: clientHeight });
  Object.defineProperty(element, "scrollTop", { configurable: true, value: scrollTop, writable: true });
  act(() => {
    fireEvent.scroll(element);
  });
}

describe("useScrollEdges", () => {
  it("topo: só há conteúdo abaixo; meio: dos dois lados; fim: só acima", () => {
    render(<Probe />);
    const list = screen.getByTestId("list");

    scrollTo(list, { scrollHeight: 560, clientHeight: 433, scrollTop: 0 });
    expect([list.dataset.above, list.dataset.below]).toEqual(["false", "true"]);

    scrollTo(list, { scrollHeight: 560, clientHeight: 433, scrollTop: 60 });
    expect([list.dataset.above, list.dataset.below]).toEqual(["true", "true"]);

    scrollTo(list, { scrollHeight: 560, clientHeight: 433, scrollTop: 127 });
    expect([list.dataset.above, list.dataset.below]).toEqual(["true", "false"]);
  });

  it("lista que cabe inteira não tem nenhuma borda esmaecida", () => {
    render(<Probe />);
    const list = screen.getByTestId("list");
    scrollTo(list, { scrollHeight: 400, clientHeight: 400, scrollTop: 0 });
    expect([list.dataset.above, list.dataset.below]).toEqual(["false", "false"]);
  });
});

describe("scrollEdgesMask", () => {
  it("esmaece só o lado com conteúdo escondido", () => {
    expect(scrollEdgesMask({ above: false, below: false })).toBeUndefined();
    expect(scrollEdgesMask({ above: false, below: true })).toBe(
      "linear-gradient(to bottom, black, black calc(100% - 48px), transparent)",
    );
    expect(scrollEdgesMask({ above: true, below: false })).toBe(
      "linear-gradient(to bottom, transparent, black 48px, black)",
    );
  });
});
