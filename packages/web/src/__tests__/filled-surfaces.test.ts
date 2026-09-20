import { describe, expect, it } from "vitest";

// Todos os componentes/páginas (sem os testes), como texto.
const sources = import.meta.glob(["/src/**/*.tsx", "!/src/**/__tests__/**"], {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

// Fundo preenchido de destaque (verde/vermelho), inclusive com prefixo de estado. Tinta de baixa
// opacidade (ex.: bg-brand-primary/15, usada em badges com texto de destaque) não conta.
const ACCENT_FILL = /\b(?:[\w-]+(?:\[[^\]]+\])?:)*bg-(brand-primary|primary|destructive|brand-danger)(?![\w-])(?:\/(\d+))?/g;
const MIN_FILL_OPACITY = 50;

// Texto pensado para ficar SOBRE uma superfície preenchida.
const CONTRAST_TEXT = /\btext-(primary-foreground|destructive-foreground|brand-bg|background|black|white)(?![\w-])/;

const hasAccentFill = (line: string) =>
  [...line.matchAll(ACCENT_FILL)].some(([, , opacity]) => opacity === undefined || Number(opacity) >= MIN_FILL_OPACITY);

// No escuro o verde/vermelho de destaque não dão 4,5:1 com branco: o fundo de botão/item preenchido
// usa os tokens "-solid" (tom mais fundo) e o texto usa o token -foreground (branco).
describe("superfícies preenchidas", () => {
  it("nenhum texto de contraste fica sobre o verde/vermelho de destaque (use bg-primary-solid / bg-destructive-solid)", () => {
    const violations: string[] = [];

    for (const [file, source] of Object.entries(sources)) {
      source.split("\n").forEach((line, index) => {
        if (hasAccentFill(line) && CONTRAST_TEXT.test(line)) {
          violations.push(`${file}:${index + 1} mistura fundo de destaque com texto de contraste`);
        }
      });
    }

    expect(Object.keys(sources).length).toBeGreaterThan(20);
    expect(violations).toEqual([]);
  });

  it("text-brand-bg (texto escuro sobre o verde) não é usado: no escuro o texto preenchido é branco", () => {
    const offenders = Object.entries(sources)
      .filter(([, source]) => /\btext-brand-bg(?![\w-])/.test(source))
      .map(([file]) => file);

    expect(offenders).toEqual([]);
  });

  it("o variant padrão do Button e as telas de autenticação usam os tokens -solid", () => {
    expect(sources["/src/components/ui/button.tsx"]).toContain("bg-primary-solid text-primary-foreground");

    for (const page of ["Login", "Register", "ForgotPassword", "ResetPassword"]) {
      expect(sources[`/src/pages/${page}.tsx`], page).not.toMatch(/bg-brand-primary/);
    }
  });
});
