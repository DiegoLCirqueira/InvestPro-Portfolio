import { describe, expect, it } from "vitest";

// Todos os componentes/páginas (sem os testes), como texto.
const sources = import.meta.glob(["/src/**/*.tsx", "!/src/**/__tests__/**"], {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

// Fundo preenchido com texto de contraste usa os tokens "-solid": no escuro o verde/vermelho
// de destaque não dão 4,5:1 com branco, então o fundo do botão é um tom mais fundo.
const FORBIDDEN_PAIRS: [textClass: string, accentFill: RegExp, hint: string][] = [
  ["text-primary-foreground", /\bbg-(brand-primary|primary)(?![\w-])/, "bg-primary-solid"],
  ["text-destructive-foreground", /\bbg-destructive(?![\w-])/, "bg-destructive-solid"],
];

describe("superfícies preenchidas", () => {
  it("nenhum texto de contraste fica sobre o verde/vermelho de destaque (use os tokens -solid)", () => {
    const violations: string[] = [];

    for (const [file, source] of Object.entries(sources)) {
      source.split("\n").forEach((line, index) => {
        for (const [textClass, accentFill, hint] of FORBIDDEN_PAIRS) {
          if (line.includes(textClass) && accentFill.test(line)) {
            violations.push(`${file}:${index + 1} usa ${textClass} sobre o token de destaque (use ${hint})`);
          }
        }
      });
    }

    expect(Object.keys(sources).length).toBeGreaterThan(20);
    expect(violations).toEqual([]);
  });
});
