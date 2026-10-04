import { createRef } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { CancelOrderDialog } from "@/components/orders/CancelOrderDialog";
import { ApiError } from "@/services/api";
import type { Order } from "@/types/order";

const mocks = vi.hoisted(() => ({ post: vi.fn() }));

vi.mock("@/services/api", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/services/api")>();
  return { ...original, api: { ...original.api, post: mocks.post } };
});

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const openBuy: Order = {
  id: "ord-1",
  assetId: "a",
  ticker: "PETR4",
  side: "BUY",
  type: "LIMIT",
  quantity: 10,
  price: 30,
  status: "OPEN",
  createdAt: "2026-10-04T10:00:00.000Z",
  executedAt: null,
  avgPrice: null,
};

function renderDialog() {
  const onClose = vi.fn();
  const onSettled = vi.fn();
  render(
    <CancelOrderDialog
      order={openBuy}
      onClose={onClose}
      onSettled={onSettled}
      returnFocusRef={createRef<HTMLElement>()}
    />,
  );
  return { onClose, onSettled };
}

describe("CancelOrderDialog", () => {
  beforeEach(() => {
    mocks.post.mockReset();
    vi.mocked(toast.error).mockClear();
    vi.mocked(toast.success).mockClear();
  });

  it("pede confirmação com o resumo da ordem e não cancela ao voltar", () => {
    const { onClose } = renderDialog();

    const dialog = screen.getByRole("alertdialog", { name: "Cancelar esta ordem?" });
    expect(dialog).toHaveTextContent(/Compra de 10 PETR4 a R\$\s?30,00 \(Limitada\)/);
    expect(dialog).toHaveTextContent("O saldo reservado para ela volta a ficar livre na hora.");

    fireEvent.click(screen.getByRole("button", { name: "Voltar" }));
    expect(onClose).toHaveBeenCalled();
    expect(mocks.post).not.toHaveBeenCalled();
  });

  it("confirmar chama POST /orders/:id/cancel e recarrega histórico e saldo", async () => {
    mocks.post.mockResolvedValue({ ...openBuy, status: "CANCELLED" });
    const { onClose, onSettled } = renderDialog();

    fireEvent.click(screen.getByRole("button", { name: "Cancelar ordem" }));

    await waitFor(() => expect(onSettled).toHaveBeenCalled());
    expect(mocks.post).toHaveBeenCalledWith("/orders/ord-1/cancel");
    expect(onClose).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith(
      "Ordem cancelada. O saldo reservado voltou a ficar livre.",
    );
  });

  it.each([
    [404, "ORDER_NOT_FOUND", "Esta ordem não foi encontrada. O histórico foi atualizado."],
    [
      409,
      "ORDER_NOT_CANCELLABLE",
      "Esta ordem já foi executada ou cancelada e não pode mais ser cancelada.",
    ],
  ])("erro %i (%s): mensagem clara e o histórico recarrega", async (status, code, message) => {
    mocks.post.mockRejectedValue(new ApiError(status, "erro do servidor", code));
    const { onSettled } = renderDialog();

    fireEvent.click(screen.getByRole("button", { name: "Cancelar ordem" }));

    await waitFor(() => expect(onSettled).toHaveBeenCalled());
    expect(toast.error).toHaveBeenCalledWith(message);
    expect(toast.success).not.toHaveBeenCalled();
  });
});
