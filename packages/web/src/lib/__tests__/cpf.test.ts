import { describe, expect, it } from "vitest";
import { formatCpf, isValidCpf, normalizeCpf } from "@/lib/cpf";

describe("cpf", () => {
  it("normaliza removendo máscara e limitando a 11 dígitos", () => {
    expect(normalizeCpf("529.982.247-25")).toBe("52998224725");
    expect(normalizeCpf("529982247259999")).toBe("52998224725");
    expect(normalizeCpf("abc")).toBe("");
  });

  it("aplica a máscara progressivamente enquanto digita", () => {
    expect(formatCpf("")).toBe("");
    expect(formatCpf("529")).toBe("529");
    expect(formatCpf("5299")).toBe("529.9");
    expect(formatCpf("529982")).toBe("529.982");
    expect(formatCpf("5299822")).toBe("529.982.2");
    expect(formatCpf("529982247")).toBe("529.982.247");
    expect(formatCpf("5299822472")).toBe("529.982.247-2");
    expect(formatCpf("52998224725")).toBe("529.982.247-25");
    expect(formatCpf("529.982.247-25")).toBe("529.982.247-25");
  });

  it("valida os dígitos verificadores (com ou sem máscara)", () => {
    expect(isValidCpf("529.982.247-25")).toBe(true);
    expect(isValidCpf("52998224725")).toBe(true);
    expect(isValidCpf("111.444.777-35")).toBe(true);
  });

  it("recusa dígito errado, tamanho errado e sequências repetidas", () => {
    expect(isValidCpf("529.982.247-26")).toBe(false);
    expect(isValidCpf("5299822472")).toBe(false);
    expect(isValidCpf("")).toBe(false);
    expect(isValidCpf("111.111.111-11")).toBe(false);
    expect(isValidCpf("00000000000")).toBe(false);
  });
});
