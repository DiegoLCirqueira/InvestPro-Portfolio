import { describe, expect, it } from "vitest";
import { segmentClassName } from "@/components/ui/segmented";

describe("segmentClassName (opções de seletor)", () => {
  it("a opção escolhida não usa o preenchimento cheio do botão que executa a ação", () => {
    const selected = segmentClassName(true);
    expect(selected).not.toMatch(/bg-primary-solid/);
    expect(selected).toMatch(/border-primary/);
    expect(selected).toMatch(/text-primary/);
  });

  it("Venda usa o tom destrutivo; opção não escolhida fica neutra", () => {
    expect(segmentClassName(true, "destructive")).toMatch(/text-destructive/);
    expect(segmentClassName(false)).toMatch(/text-muted-foreground/);
  });
});
