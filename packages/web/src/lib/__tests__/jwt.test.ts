import { describe, expect, it } from "vitest";
import { isAccessTokenFresh } from "@/lib/jwt";

const tokenWithExp = (exp: unknown) => `h.${btoa(JSON.stringify({ exp })).replace(/=+$/, "")}.s`;
const now = 1_800_000_000_000;

describe("isAccessTokenFresh", () => {
  it("vale quando falta mais que a margem (30 s)", () => {
    expect(isAccessTokenFresh(tokenWithExp(now / 1000 + 600), { now })).toBe(true);
  });

  it("não vale vencido, dentro da margem, sem exp, ilegível ou ausente", () => {
    expect(isAccessTokenFresh(tokenWithExp(now / 1000 - 1), { now })).toBe(false);
    expect(isAccessTokenFresh(tokenWithExp(now / 1000 + 20), { now })).toBe(false);
    expect(isAccessTokenFresh(tokenWithExp(undefined), { now })).toBe(false);
    expect(isAccessTokenFresh("abc", { now })).toBe(false);
    expect(isAccessTokenFresh("h.@@@.s", { now })).toBe(false);
    expect(isAccessTokenFresh(null, { now })).toBe(false);
  });

  it("aceita base64url (- e _) do JWT", () => {
    const base64url = btoa(JSON.stringify({ exp: now / 1000 + 600, note: "??>>" })).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    expect(isAccessTokenFresh(`h.${base64url}.s`, { now })).toBe(true);
  });
});
