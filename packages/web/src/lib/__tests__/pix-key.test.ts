import { describe, expect, it } from "vitest";
import { formatStoredPixKey, maskNumericPixKey, pixKeyCandidates } from "@/lib/pix-key";

// CPF válido cujos dígitos também formam um celular (DDD 82 + 9).
const AMBIGUOUS_CPF_OR_PHONE = "82991234539";

const typesOf = (raw: string) => pixKeyCandidates(raw).map((key) => key.type);

describe("pixKeyCandidates (espelho da regra do @investpro/shared)", () => {
  it.each([
    ["82991234567", ["PHONE"]],
    ["52998224725", ["CPF"]],
    ["529.982.247-25", ["CPF"]],
    ["11.222.333/0001-81", ["CNPJ"]],
    ["fulano@exemplo.com", ["EMAIL"]],
    ["+55 (82) 99123-4567", ["PHONE"]],
    ["123e4567-e89b-12d3-a456-426614174000", ["EVP"]],
    [AMBIGUOUS_CPF_OR_PHONE, ["CPF", "PHONE"]],
  ])("%s → %j", (raw, expected) => {
    expect(typesOf(raw)).toEqual(expected);
  });

  it.each(["", "isso-nao-e-chave", "13819183443", "11222333000182", "fulano@", "+55 11 3333-4444", "20991234567"])(
    "recusa %s",
    (raw) => {
      expect(pixKeyCandidates(raw)).toEqual([]);
    },
  );

  it("celular é normalizado em E.164", () => {
    expect(pixKeyCandidates("82 99123-4567")).toEqual([{ type: "PHONE", value: "+5582991234567" }]);
  });
});

describe("maskNumericPixKey", () => {
  it.each([
    ["82991234567", "82 99123-4567"],
    ["52998224725", "529.982.247-25"],
    ["11222333000181", "11.222.333/0001-81"],
    ["8299110", "8299110"],
    ["529.982.247-253", "529982247253"],
    [AMBIGUOUS_CPF_OR_PHONE, AMBIGUOUS_CPF_OR_PHONE],
    ["112223330001819", "11.222.333/0001-81"],
  ])("%s → %s", (raw, expected) => {
    expect(maskNumericPixKey(raw)).toBe(expected);
  });
});

describe("formatStoredPixKey", () => {
  it.each([
    ["+5582991234567", "82 99123-4567"],
    ["52998224725", "529.982.247-25"],
    ["11222333000181", "11.222.333/0001-81"],
    ["fulano@exemplo.com", "fulano@exemplo.com"],
  ])("%s → %s", (stored, expected) => {
    expect(formatStoredPixKey(stored)).toBe(expected);
  });
});
