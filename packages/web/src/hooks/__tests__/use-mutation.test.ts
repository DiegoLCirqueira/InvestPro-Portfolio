import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useMutation } from "@/hooks/use-mutation";

describe("useMutation", () => {
  it("executa a ação, expõe o resultado e chama onSuccess", async () => {
    const onSuccess = vi.fn();
    const { result } = renderHook(() =>
      useMutation<number, number>({
        action: async (v: number) => v * 2,
        onSuccess,
      }),
    );

    let promise!: Promise<number>;
    act(() => {
      promise = result.current.mutate(21);
    });
    await act(async () => {
      await promise;
    });

    expect(result.current.data).toBe(42);
    expect(result.current.isPending).toBe(false);
    expect(onSuccess).toHaveBeenCalledWith(42);
  });

  it("expõe error quando a ação falha", async () => {
    const onError = vi.fn();
    const { result } = renderHook(() =>
      useMutation<number, number>({
        action: async () => {
          throw new Error("falha");
        },
        onError,
      }),
    );

    let promise!: Promise<number>;
    act(() => {
      promise = result.current.mutate(1);
    });
    await act(async () => {
      await expect(promise).rejects.toThrow("falha");
    });

    expect(result.current.error?.message).toBe("falha");
    expect(onError).toHaveBeenCalled();
  });

  it("isPending fica true durante a execução", async () => {
    let resolveAction: (value: number) => void = () => {};
    const pending = new Promise<number>((resolve) => {
      resolveAction = resolve;
    });

    const { result } = renderHook(() =>
      useMutation<number, number>({ action: () => pending }),
    );

    let promise!: Promise<number>;
    act(() => {
      promise = result.current.mutate(1);
    });
    expect(result.current.isPending).toBe(true);

    await act(async () => {
      resolveAction(7);
      await promise;
    });
    expect(result.current.isPending).toBe(false);
    expect(result.current.data).toBe(7);
  });

  it("atualiza onSuccess conforme o render atual", async () => {
    const onSuccessA = vi.fn();
    const { result, rerender } = renderHook(
      ({ cb }) =>
        useMutation<number, number>({
          action: async (v: number) => v,
          onSuccess: cb,
        }),
      { initialProps: { cb: onSuccessA } },
    );

    const onSuccessB = vi.fn();
    rerender({ cb: onSuccessB });

    let promise!: Promise<number>;
    act(() => {
      promise = result.current.mutate(5);
    });
    await act(async () => {
      await promise;
    });

    expect(onSuccessB).toHaveBeenCalledWith(5);
  });
});
