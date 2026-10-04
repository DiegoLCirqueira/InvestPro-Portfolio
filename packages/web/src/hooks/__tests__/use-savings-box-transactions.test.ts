import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useSavingsBoxTransactions } from "@/hooks/use-savings-box";
import type { SavingsBoxTransaction } from "@/types/savings-box";

const mocks = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock("@/services/api", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/services/api")>();
  return { ...original, api: { ...original.api, get: mocks.get } };
});

const tx = (id: string): SavingsBoxTransaction => ({
  id,
  type: "DEPOSIT",
  amount: 100,
  balanceAfter: 100,
  createdAt: "2026-10-04T10:00:00.000Z",
  orderId: null,
});

describe("useSavingsBoxTransactions (extrato com cursor)", () => {
  beforeEach(() => mocks.get.mockReset());

  it("pede 10 por vez e acrescenta a próxima página pelo cursor", async () => {
    mocks.get
      .mockResolvedValueOnce({ items: [tx("a"), tx("b")], nextCursor: "b" })
      .mockResolvedValueOnce({ items: [tx("c")], nextCursor: null });
    const { result } = renderHook(() => useSavingsBoxTransactions());

    await waitFor(() => expect(result.current.items).toHaveLength(2));
    expect(mocks.get).toHaveBeenCalledWith("/savings-box/transactions", {
      limit: 10,
      cursor: undefined,
    });
    expect(result.current.hasMore).toBe(true);

    await act(() => result.current.loadMore());

    expect(mocks.get).toHaveBeenLastCalledWith("/savings-box/transactions", {
      limit: 10,
      cursor: "b",
    });
    expect(result.current.items.map((item) => item.id)).toEqual(["a", "b", "c"]);
    expect(result.current.hasMore).toBe(false);
  });

  it("depois do refetch, recomeça do topo (as páginas extras eram da lista antiga)", async () => {
    mocks.get
      .mockResolvedValueOnce({ items: [tx("a")], nextCursor: "a" })
      .mockResolvedValueOnce({ items: [tx("b")], nextCursor: null })
      .mockResolvedValueOnce({ items: [tx("novo"), tx("a")], nextCursor: "a" });
    const { result } = renderHook(() => useSavingsBoxTransactions());
    await waitFor(() => expect(result.current.items).toHaveLength(1));
    await act(() => result.current.loadMore());
    expect(result.current.items).toHaveLength(2);

    await act(() => result.current.refetch());

    expect(result.current.items.map((item) => item.id)).toEqual(["novo", "a"]);
    expect(result.current.hasMore).toBe(true);
  });

  it("falha no Ver mais fica no próprio estado, sem perder o que já carregou", async () => {
    mocks.get
      .mockResolvedValueOnce({ items: [tx("a")], nextCursor: "a" })
      .mockRejectedValueOnce(new Error("rede"));
    const { result } = renderHook(() => useSavingsBoxTransactions());
    await waitFor(() => expect(result.current.items).toHaveLength(1));

    await act(() => result.current.loadMore());

    expect(result.current.loadMoreError?.message).toBe("rede");
    expect(result.current.items).toHaveLength(1);
    expect(result.current.hasMore).toBe(true);
  });
});
