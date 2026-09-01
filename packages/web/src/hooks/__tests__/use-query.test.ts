import { describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useQuery } from "@/hooks/use-query";

describe("useQuery", () => {
  it("executa o fetcher e expõe os dados", async () => {
    const fetcher = vi.fn().mockResolvedValue(42);
    const { result } = renderHook(() =>
      useQuery({ fetcher, deps: [], initialData: undefined }),
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.data).toBe(42));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isFetching).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("expõe o erro quando o fetcher falha", async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error("boom"));
    const { result } = renderHook(() => useQuery({ fetcher, deps: [] }));

    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error?.message).toBe("boom");
    expect(result.current.data).toBeUndefined();
  });

  it("executa novamente quando as deps mudam", async () => {
    const fetcher = vi.fn().mockImplementation(() => Promise.resolve("value"));
    const { rerender } = renderHook(
      ({ dep }) => useQuery({ fetcher, deps: [dep] }),
      { initialProps: { dep: "a" } },
    );

    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));

    rerender({ dep: "b" });
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
  });

  it("não executa quando enabled é false", async () => {
    const fetcher = vi.fn().mockResolvedValue("value");
    renderHook(() => useQuery({ fetcher, deps: [], enabled: false }));

    expect(fetcher).not.toHaveBeenCalled();
  });

  it("suporta refetch manual", async () => {
    const fetcher = vi.fn().mockResolvedValue("value");
    const { result } = renderHook(() => useQuery({ fetcher, deps: [] }));

    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));

    await act(async () => {
      await result.current.refetch();
    });

    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("aplica debounce antes de executar", async () => {
    const fetcher = vi.fn().mockResolvedValue("value");
    renderHook(() => useQuery({ fetcher, deps: [], debounceMs: 100 }));

    expect(fetcher).not.toHaveBeenCalled();
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
  });

  it("cancela requisições pendentes quando as deps mudam", async () => {
    let resolveFirst: (value: unknown) => void = () => {};
    const first = new Promise((resolve) => {
      resolveFirst = resolve;
    });

    const fetcher = vi
      .fn()
      .mockImplementationOnce(() => first)
      .mockResolvedValueOnce("updated");

    const { result, rerender } = renderHook(
      ({ dep }) => useQuery({ fetcher, deps: [dep] }),
      { initialProps: { dep: "a" } },
    );

    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));

    rerender({ dep: "b" });
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));

    await act(async () => {
      resolveFirst("stale");
    });

    expect(result.current.data).toBe("updated");
  });
});
