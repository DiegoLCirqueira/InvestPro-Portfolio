import * as React from "react";
import { toast } from "sonner";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCancelOrder } from "@/hooks/use-orders";
import { formatCurrency, formatQuantity } from "@/lib/format";
import { ORDER_TYPE_LABELS } from "@/lib/order-form";
import { ApiError } from "@/services/api";
import type { Order } from "@/types/order";

// 404/409 querem dizer que a lista na tela ficou velha (outra aba executou/cancelou a ordem):
// a mensagem diz o que aconteceu, e o histórico é recarregado em seguida.
function cancelErrorMessage(error: Error) {
  if (error instanceof ApiError && error.code === "ORDER_NOT_FOUND") {
    return "Esta ordem não foi encontrada. O histórico foi atualizado.";
  }
  if (error instanceof ApiError && error.code === "ORDER_NOT_CANCELLABLE") {
    return "Esta ordem já foi executada ou cancelada e não pode mais ser cancelada.";
  }
  return error.message || "Não foi possível cancelar a ordem. Tente novamente.";
}

interface CancelOrderDialogProps {
  /** Ordem a cancelar; null fecha o diálogo. */
  order: Order | null;
  onClose: () => void;
  /**
   * Depois de cancelar (ou de saber que a lista estava velha), antes de fechar: para recarregar
   * histórico e saldo e, se quiser, trocar o returnFocusRef.
   */
  onSettled: () => void;
  /** Recebe o foco ao fechar: o diálogo não tem Trigger do Radix. */
  returnFocusRef: React.RefObject<HTMLElement | null>;
}

/** Confirmação antes de cancelar uma ordem aberta (mesmo padrão do diálogo de sair). */
export function CancelOrderDialog({
  order,
  onClose,
  onSettled,
  returnFocusRef,
}: CancelOrderDialogProps) {
  const cancel = useCancelOrder({
    onSuccess: (cancelled) => {
      toast.success(
        cancelled.side === "BUY"
          ? "Ordem cancelada. O saldo reservado voltou a ficar livre."
          : "Ordem cancelada. A quantidade reservada voltou a ficar livre.",
      );
    },
    onError: (error) => toast.error(cancelErrorMessage(error)),
  });

  const handleConfirm = async () => {
    if (!order) return;
    try {
      await cancel.mutate(order.id);
    } catch {
      // Mensagem já mostrada no onError; a lista recarrega igual.
    }
    // Antes de fechar: a página pode trocar o alvo do foco de volta (o botão Cancelar some).
    onSettled();
    onClose();
  };

  return (
    <Dialog
      open={order !== null}
      onOpenChange={(next) => !next && !cancel.isPending && onClose()}
    >
      <DialogContent
        hideCloseButton
        // Ação destrutiva: alertdialog, e clicar fora não fecha.
        role="alertdialog"
        onPointerDownOutside={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => {
          if (!returnFocusRef.current) return;
          event.preventDefault();
          returnFocusRef.current.focus();
        }}
        className="flex max-w-sm flex-col items-center gap-3 text-center"
      >
        <XCircle size={32} className="text-destructive" aria-hidden="true" />
        <DialogTitle className="text-foreground font-semibold text-lg">
          Cancelar esta ordem?
        </DialogTitle>
        {order && (
          <DialogDescription>
            {order.side === "BUY" ? "Compra" : "Venda"} de{" "}
            <span className="font-semibold text-foreground tabular-nums">
              {formatQuantity(order.quantity)} {order.ticker}
            </span>
            {typeof order.price === "number" && (
              <>
                {" "}a{" "}
                <span className="font-semibold text-foreground tabular-nums">
                  {formatCurrency(order.price)}
                </span>
              </>
            )}{" "}
            ({ORDER_TYPE_LABELS[order.type]}).{" "}
            {order.side === "BUY"
              ? "O saldo reservado para ela volta a ficar livre na hora."
              : "A quantidade reservada para ela volta a ficar livre na hora."}
          </DialogDescription>
        )}
        <DialogFooter className="mt-2 w-full">
          <DialogClose asChild>
            <Button variant="outline" className="h-11 sm:flex-1" disabled={cancel.isPending}>
              Voltar
            </Button>
          </DialogClose>
          <Button
            variant="destructive"
            className="h-11 sm:flex-1"
            onClick={handleConfirm}
            disabled={cancel.isPending}
          >
            {cancel.isPending ? "Cancelando..." : "Cancelar ordem"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
