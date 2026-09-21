import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { toast } from "sonner";
import { useFinancialErrorHandler } from "@/hooks/use-financial-error-handler";
import {
  OPERATION_CONFLICT_MESSAGE,
  SERVICE_UNAVAILABLE_MESSAGE,
  SESSION_EXPIRED_MESSAGE,
} from "@/lib/financial-error";
import { ApiError } from "@/services/api";
import { useInsufficientBalanceStore } from "@/stores/insufficient-balance";

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

describe("useFinancialErrorHandler", () => {
  beforeEach(() => {
    vi.mocked(toast.error).mockClear();
    useInsufficientBalanceStore.setState({ isOpen: false });
  });

  it("saldo insuficiente abre só o pop-up, sem toast", () => {
    const { result } = renderHook(() => useFinancialErrorHandler(["ORDER_INSUFFICIENT_BALANCE"]));

    result.current(new ApiError(400, "sem saldo", "ORDER_INSUFFICIENT_BALANCE"));

    expect(useInsufficientBalanceStore.getState().isOpen).toBe(true);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("409 de conflito vira mensagem amigável de 'tente novamente'", () => {
    const { result } = renderHook(() => useFinancialErrorHandler());

    result.current(new ApiError(409, "could not serialize access", "ORDER_EXECUTION_CONFLICT"));

    expect(toast.error).toHaveBeenCalledWith(OPERATION_CONFLICT_MESSAGE, expect.any(Object));
    expect(OPERATION_CONFLICT_MESSAGE).toMatch(/tente novamente/i);
    expect(useInsufficientBalanceStore.getState().isOpen).toBe(false);
  });

  it("503 (sem cotação viva) vira mensagem amigável de 'tente novamente'", () => {
    const { result } = renderHook(() => useFinancialErrorHandler());

    result.current(new ApiError(503, "upstream", "EXCHANGE_RATE_UNAVAILABLE"));

    expect(toast.error).toHaveBeenCalledWith(SERVICE_UNAVAILABLE_MESSAGE, expect.any(Object));
    expect(SERVICE_UNAVAILABLE_MESSAGE).toMatch(/tente novamente/i);
  });

  it("erros em sequência usam o mesmo id de toast (não empilham)", () => {
    const { result } = renderHook(() => useFinancialErrorHandler());

    result.current(new ApiError(409, "x"));
    result.current(new ApiError(409, "x"));

    const ids = vi.mocked(toast.error).mock.calls.map(([, options]) => options?.id);
    expect(ids[0]).toBeDefined();
    expect(ids[0]).toBe(ids[1]);
  });

  it("429 vira mensagem própria em pt-BR, sem o texto cru do servidor", () => {
    const { result } = renderHook(() => useFinancialErrorHandler());

    result.current(new ApiError(429, "Rate limit exceeded, retry in 12 seconds", "RATE_LIMIT_EXCEEDED", 12));

    expect(toast.error).toHaveBeenCalledWith(
      "Muitas tentativas. Tente novamente em 12 segundos.",
      expect.any(Object),
    );
  });

  it("401 avisa que a sessão expirou; outros erros mostram a mensagem do servidor", () => {
    const { result } = renderHook(() => useFinancialErrorHandler());

    result.current(new ApiError(401, "Unauthorized"));
    result.current(new ApiError(400, "Quantidade inválida"));

    expect(toast.error).toHaveBeenNthCalledWith(1, SESSION_EXPIRED_MESSAGE, expect.any(Object));
    expect(toast.error).toHaveBeenNthCalledWith(2, "Quantidade inválida", expect.any(Object));
  });

  it("um código de saldo de OUTRO fluxo não abre o pop-up", () => {
    const { result } = renderHook(() =>
      useFinancialErrorHandler(["PORTFOLIO_INSUFFICIENT_BALANCE"]),
    );

    result.current(new ApiError(400, "Saldo da caixinha", "SAVINGS_BOX_INSUFFICIENT_BALANCE"));

    expect(useInsufficientBalanceStore.getState().isOpen).toBe(false);
    expect(toast.error).toHaveBeenCalled();
  });
});
