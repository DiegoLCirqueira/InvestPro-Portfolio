import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Combobox } from "@/components/ui/combobox";
import { ensureRoomBelow } from "@/components/ui/combobox/ensure-room-below";
import { MENU_MIN_HEIGHT_PX } from "@/components/ui/popover";

function anchorWithBottomAt(bottom: number) {
  const scrollIntoView = vi.fn();
  const anchor = {
    getBoundingClientRect: () => ({ bottom }),
    scrollIntoView,
  } as unknown as HTMLElement;
  return { anchor, scrollIntoView };
}

describe("ensureRoomBelow", () => {
  afterEach(() => vi.restoreAllMocks());

  it("rola a página quando o espaço embaixo é menor que o mínimo útil", () => {
    vi.spyOn(window, "innerHeight", "get").mockReturnValue(720);
    const { anchor, scrollIntoView } = anchorWithBottomAt(720 - MENU_MIN_HEIGHT_PX / 2);

    ensureRoomBelow(anchor);

    expect(scrollIntoView).toHaveBeenCalledWith({ block: "center" });
  });

  it("não mexe na página quando há espaço embaixo", () => {
    vi.spyOn(window, "innerHeight", "get").mockReturnValue(900);
    const { anchor, scrollIntoView } = anchorWithBottomAt(300);

    ensureRoomBelow(anchor);

    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("ao abrir o menu sem espaço, o gatilho é rolado para o centro", () => {
    vi.spyOn(window, "innerHeight", "get").mockReturnValue(720);
    const scrollIntoView = vi.spyOn(Element.prototype, "scrollIntoView");
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      bottom: 700,
    } as DOMRect);

    render(
      <Combobox
        options={[{ value: "a", label: "A" }]}
        value=""
        onValueChange={() => {}}
        placeholder="Escolha"
      />,
    );
    fireEvent.click(screen.getByRole("combobox"));

    expect(scrollIntoView).toHaveBeenCalledWith({ block: "center" });
  });
});
