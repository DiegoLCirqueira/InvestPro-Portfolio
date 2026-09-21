import { describe, expect, it } from "vitest";
import { apiErrorMessage, isRateLimitError, rateLimitMessage } from "@/lib/rate-limit";
import { ApiError } from "@/services/api";

describe("rateLimitMessage", () => {
  it.each([
    [47, "Muitas tentativas. Tente novamente em 47 segundos."],
    [1, "Muitas tentativas. Tente novamente em 1 segundo."],
    [46.2, "Muitas tentativas. Tente novamente em 47 segundos."],
    [60, "Muitas tentativas. Tente novamente em 1 minuto."],
    [130, "Muitas tentativas. Tente novamente em 3 minutos."],
  ])("Retry-After de %s s vira %j", (seconds, expected) => {
    expect(rateLimitMessage(seconds)).toBe(expected);
  });

  it.each([undefined, 0])("sem prazo legível (%s) diz 'em alguns instantes', sem inventar número", (seconds) => {
    expect(rateLimitMessage(seconds)).toBe("Muitas tentativas. Tente novamente em alguns instantes.");
  });
});

describe("apiErrorMessage", () => {
  it.each(["RATE_LIMIT_EXCEEDED", "ACCOUNT_RATE_LIMITED"])(
    "429 %s nunca repassa o texto cru do servidor",
    (code) => {
      const error = new ApiError(429, "Rate limit exceeded, retry in 47 seconds", code, 47);

      expect(isRateLimitError(error)).toBe(true);
      expect(apiErrorMessage(error)).toBe("Muitas tentativas. Tente novamente em 47 segundos.");
    },
  );

  it("429 sem Retry-After exposto cai em 'alguns instantes'", () => {
    const error = new ApiError(429, "Rate limit exceeded", "RATE_LIMIT_EXCEEDED");

    expect(apiErrorMessage(error)).toBe("Muitas tentativas. Tente novamente em alguns instantes.");
  });

  it("outros erros mantêm a mensagem do servidor", () => {
    const error = new ApiError(401, "Email ou senha inválidos", "INVALID_CREDENTIALS");

    expect(isRateLimitError(error)).toBe(false);
    expect(apiErrorMessage(error)).toBe("Email ou senha inválidos");
  });

  it("só ApiError conta como limite de tentativas", () => {
    expect(isRateLimitError(new Error("429"))).toBe(false);
    expect(isRateLimitError(undefined)).toBe(false);
  });
});
