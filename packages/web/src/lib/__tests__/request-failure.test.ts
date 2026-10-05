import { describe, expect, it } from "vitest";
import { classifyRequestFailure } from "@/lib/request-failure";
import { ApiError } from "@/services/api";

describe("classifyRequestFailure", () => {
  it("429 é excesso de requisições", () => {
    expect(classifyRequestFailure(new ApiError(429, "x", "RATE_LIMIT_EXCEEDED", 30))).toBe(
      "rate-limited",
    );
  });

  it("401 é sessão encerrada", () => {
    expect(classifyRequestFailure(new ApiError(401, "x"))).toBe("unauthenticated");
  });

  it.each([
    ["rede (fetch falhou)", new TypeError("Failed to fetch")],
    ["404 da plataforma (aplicação fora do ar)", new ApiError(404, "Application not found")],
    ["500", new ApiError(500, "Erro interno")],
    ["503", new ApiError(503, "Indisponível")],
    ["sem erro conhecido", null],
  ])("%s é servidor inalcançável", (_cause, error) => {
    expect(classifyRequestFailure(error)).toBe("unreachable");
  });
});
