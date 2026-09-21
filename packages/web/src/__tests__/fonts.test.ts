import { describe, expect, it } from "vitest";
import indexCss from "@/index.css?raw";
import mainTsx from "@/main.tsx?raw";

const FONT_WEIGHTS = [400, 500, 600, 700];

// O Tailwind v4 não reescreve os url() de um CSS trazido por @import: os .woff2 do fontsource
// ficam apontando para "./files/..." (que o build não gera) e, na Vercel, esse caminho devolve o
// HTML do SPA. Importado a partir do JS, o Vite processa os url() e emite os arquivos com hash.
describe("fontes do app (Plus Jakarta Sans)", () => {
  it("o CSS não traz as fontes por @import (os url() ficariam quebrados no build)", () => {
    expect(indexCss).not.toMatch(/@import\s+(?:url\()?["']?@fontsource/);
  });

  it.each(FONT_WEIGHTS)("main.tsx importa o peso %i pelo JS", (weight) => {
    expect(mainTsx).toContain(`import "@fontsource/plus-jakarta-sans/${weight}.css";`);
  });
});
