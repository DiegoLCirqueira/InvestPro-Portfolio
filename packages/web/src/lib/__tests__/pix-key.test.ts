import { describe, expect, it } from "vitest";
import { isValidPixKey } from "@/lib/pix-key";

describe("isValidPixKey (espelho da regra do @investpro/shared)", () => {
  it.each([
    "529.982.247-25",
    "52998224725",
    "11.222.333/0001-81",
    "fulano@exemplo.com",
    "+55 (11) 98765-4321",
    "123e4567-e89b-12d3-a456-426614174000",
  ])("aceita %s", (key) => {
    expect(isValidPixKey(key)).toBe(true);
  });

  it.each(["", "   ", "isso-nao-e-chave", "52998224724", "11222333000182", "fulano@", "+1 202 555 0100", "11987654321"])(
    "recusa %s",
    (key) => {
      expect(isValidPixKey(key)).toBe(false);
    },
  );
});
