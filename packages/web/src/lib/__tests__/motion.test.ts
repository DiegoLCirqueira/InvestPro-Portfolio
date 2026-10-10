import { afterEach, describe, expect, it, vi } from "vitest";
import { preferredScrollBehavior, prefersReducedMotion } from "@/lib/motion";

const mockReducedMotion = (reduce: boolean) =>
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("reduce") && reduce,
  }));

describe("movimento reduzido", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("rolagem por código é instantânea com movimento reduzido e suave sem ele", () => {
    mockReducedMotion(true);
    expect(preferredScrollBehavior()).toBe("auto");
    mockReducedMotion(false);
    expect(preferredScrollBehavior()).toBe("smooth");
  });

  it("animações seguem a preferência do sistema", () => {
    mockReducedMotion(true);
    expect(prefersReducedMotion()).toBe(true);
    mockReducedMotion(false);
    expect(prefersReducedMotion()).toBe(false);
  });
});
