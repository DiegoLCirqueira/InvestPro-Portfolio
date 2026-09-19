import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import type { FormEvent } from "react";
import { useSubmitOnce } from "@/hooks/use-submit-once";

const fakeSubmitEvent = () => {
  const preventDefault = vi.fn();
  return { event: { preventDefault } as unknown as FormEvent, preventDefault };
};

describe("useSubmitOnce", () => {
  it("cliques no mesmo tick executam o envio uma única vez", async () => {
    let finish: () => void = () => {};
    const submit = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
    const { result } = renderHook(() => useSubmitOnce(submit));

    const calls = [1, 2, 3].map(() => result.current(fakeSubmitEvent().event));
    finish();
    await Promise.all(calls);

    expect(submit).toHaveBeenCalledTimes(1);
  });

  it("sempre chama preventDefault, inclusive nos envios ignorados", async () => {
    const submit = vi.fn(() => new Promise<void>(() => {}));
    const { result } = renderHook(() => useSubmitOnce(submit));
    const first = fakeSubmitEvent();
    const ignored = fakeSubmitEvent();

    void result.current(first.event);
    await result.current(ignored.event);

    expect(first.preventDefault).toHaveBeenCalled();
    expect(ignored.preventDefault).toHaveBeenCalled();
  });

  it("libera a trava quando o envio termina, para um novo envio legítimo", async () => {
    const submit = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useSubmitOnce(submit));

    await result.current(fakeSubmitEvent().event);
    await result.current(fakeSubmitEvent().event);

    expect(submit).toHaveBeenCalledTimes(2);
  });

  it("libera a trava também quando o envio falha", async () => {
    const submit = vi.fn().mockRejectedValueOnce(new Error("boom")).mockResolvedValue(undefined);
    const { result } = renderHook(() => useSubmitOnce(submit));

    await expect(result.current(fakeSubmitEvent().event)).rejects.toThrow("boom");
    await result.current(fakeSubmitEvent().event);

    expect(submit).toHaveBeenCalledTimes(2);
  });
});
