import { describe, expect, it } from "vitest";
import { formatCurrency, formatUnitPrice } from "@/lib/format";

describe("formatUnitPrice (preço unitário de execução)", () => {
  it("mostra até 4 casas quando o preço tem mais de 2", () => {
    expect(formatUnitPrice(4.9918)).toMatch(/^R\$\s?4,9918$/);
    // Acima de 4 casas arredonda na 4ª (o servidor guarda até 8).
    expect(formatUnitPrice(4.99184321)).toMatch(/^R\$\s?4,9918$/);
  });

  it("sem zeros sobrando: 4,99 continua 4,99 e 5 vira 5,00", () => {
    expect(formatUnitPrice(4.99)).toMatch(/^R\$\s?4,99$/);
    expect(formatUnitPrice(4.9)).toMatch(/^R\$\s?4,90$/);
    expect(formatUnitPrice(5)).toMatch(/^R\$\s?5,00$/);
  });

  it("o formatCurrency geral não muda (2 casas)", () => {
    expect(formatCurrency(4.9918)).toMatch(/^R\$\s?4,99$/);
  });
});
