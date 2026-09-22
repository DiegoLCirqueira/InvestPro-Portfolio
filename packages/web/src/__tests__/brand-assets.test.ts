import { describe, expect, it } from "vitest";
import { BRAND_MARK_SRC } from "@/components/BrandMark";
import indexHtml from "../../index.html?raw";

// Regressão do tipo "o HTML aponta para um arquivo que não existe": o navegador
// cai em silêncio no fallback (favicon genérico, imagem quebrada). A lista de
// arquivos de public/ vem do glob do Vite (só as chaves; nada é carregado).
const publicFiles = new Set(
  Object.keys(import.meta.glob("../../public/*", { query: "?url", import: "default" })).map(
    (path) => `/${path.split("/").pop()}`,
  ),
);

describe("ícones da marca", () => {
  const iconHrefs = [...indexHtml.matchAll(/<link[^>]*rel="(?:icon|apple-touch-icon)"[^>]*href="([^"]+)"/g)].map(
    (m) => m[1],
  );

  it("o index.html declara favicon ico, PNGs de tamanhos diferentes e apple-touch-icon", () => {
    expect(iconHrefs).toContain("/favicon.ico");
    expect(iconHrefs.filter((href) => href.endsWith(".png")).length).toBeGreaterThanOrEqual(3);
    expect(indexHtml).toContain('rel="apple-touch-icon"');
  });

  it.each(iconHrefs)("o arquivo referenciado %s existe em public/", (href) => {
    expect(publicFiles.has(href)).toBe(true);
  });

  it("a marca usada no Header e no Sidebar existe em public/", () => {
    expect(publicFiles.has(BRAND_MARK_SRC)).toBe(true);
  });

  it("o favicon antigo (favicon.png) não é mais referenciado", () => {
    expect(indexHtml).not.toContain('href="/favicon.png"');
  });
});
