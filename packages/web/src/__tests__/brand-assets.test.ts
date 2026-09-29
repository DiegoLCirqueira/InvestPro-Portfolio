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

describe("metadados da página inicial (index.html)", () => {
  const meta = (attr: string, key: string) =>
    new RegExp(`<meta ${attr}="${key}" content="([^"]+)"`).exec(indexHtml)?.[1];

  it("tem título, descrição e Open Graph em pt-BR", () => {
    expect(indexHtml).toContain("<title>InvestPro · Simulador de investimentos</title>");
    expect(meta("name", "description")).toMatch(/Simulador de investimentos/);
    expect(meta("property", "og:locale")).toBe("pt_BR");
    expect(meta("property", "og:title")).toMatch(/InvestPro/);
    expect(meta("property", "og:description")).toMatch(/operações simuladas/);
  });

  it("a imagem do Open Graph é a logo, com URL absoluta e arquivo existente em public/", () => {
    const image = meta("property", "og:image")!;
    expect(image).toMatch(/^https:\/\/investpro\.dev\.br\//);
    expect(publicFiles.has(new URL(image).pathname)).toBe(true);
  });
});
