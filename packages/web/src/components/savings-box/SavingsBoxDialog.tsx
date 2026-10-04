import { useId, type RefObject } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { CurrencyDigitsField } from "@/components/CurrencyDigitsField";
import { FormField } from "@/components/FormField";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCurrencyDigitsInput } from "@/hooks/use-currency-digits-input";
import { useFinancialErrorHandler } from "@/hooks/use-financial-error-handler";
import { useSavingsBoxDeposit, useSavingsBoxWithdraw } from "@/hooks/use-savings-box";
import { useSubmitOnce } from "@/hooks/use-submit-once";
import { formatCurrency } from "@/lib/format";

export type SavingsBoxMode = "DEPOSIT" | "WITHDRAW";

const COPY: Record<
  SavingsBoxMode,
  { title: string; description: string; action: string; success: string }
> = {
  DEPOSIT: {
    title: "Depositar na Caixinha",
    description: "Sai do Saldo em conta e passa a render 100% do CDI.",
    action: "Depositar",
    success: "Depósito realizado com sucesso!",
  },
  WITHDRAW: {
    title: "Resgatar da Caixinha",
    description: "Volta para o Saldo em conta.",
    action: "Resgatar",
    success: "Resgate realizado com sucesso!",
  },
};

interface SavingsBoxDialogProps {
  /** Qual movimento está aberto; null fecha o diálogo. */
  mode: SavingsBoxMode | null;
  onClose: () => void;
  accountBalance: number;
  savingsBalance: number;
  /** Depois do movimento, para o Painel recarregar os dois saldos. */
  onSuccess: () => void;
  /** Botão que abriu o diálogo: recebe o foco de volta ao fechar. */
  returnFocusTo: RefObject<HTMLElement | null>;
}

// Depositar e Resgatar abrem o mesmo diálogo, invertido: no Painel não há formulário fixo.
export function SavingsBoxDialog({ mode, onClose, ...props }: SavingsBoxDialogProps) {
  return (
    <Dialog open={mode !== null} onOpenChange={(open) => !open && onClose()}>
      {/* key: trocar de Depositar para Resgatar começa do campo vazio. */}
      {mode && <SavingsBoxDialogContent key={mode} mode={mode} onClose={onClose} {...props} />}
    </Dialog>
  );
}

function SavingsBoxDialogContent({
  mode,
  onClose,
  accountBalance,
  savingsBalance,
  onSuccess,
  returnFocusTo,
}: Omit<SavingsBoxDialogProps, "mode"> & { mode: SavingsBoxMode }) {
  const limitNoteId = useId();
  const amountInput = useCurrencyDigitsInput();
  const amount = amountInput.amount;
  const copy = COPY[mode];

  // Depositar sai do saldo em conta; resgatar sai do saldo da Caixinha.
  const available = mode === "DEPOSIT" ? accountBalance : savingsBalance;
  const where = mode === "DEPOSIT" ? "em conta" : "na Caixinha";
  const isEmpty = available <= 0;
  const exceedsAvailable = amount > available;
  // Botão desabilitado sempre com o motivo ao lado (antes só dizia "Você tem R$ X em conta").
  const blockReason = isEmpty
    ? mode === "DEPOSIT"
      ? "Você não tem saldo em conta para depositar."
      : "A Caixinha está vazia: não há o que resgatar."
    : exceedsAvailable
      ? `O valor passa do que você tem ${where}: faltam ${formatCurrency(amount - available)}. Você tem ${formatCurrency(available)} ${where}.`
      : null;

  const handleError = useFinancialErrorHandler([
    mode === "DEPOSIT" ? "PORTFOLIO_INSUFFICIENT_BALANCE" : "SAVINGS_BOX_INSUFFICIENT_BALANCE",
  ]);
  const mutationOptions = {
    onSuccess: () => {
      toast.success(copy.success);
      onClose();
      onSuccess();
    },
    onError: handleError,
  };
  const deposit = useSavingsBoxDeposit(mutationOptions);
  const withdraw = useSavingsBoxWithdraw(mutationOptions);
  const mutation = mode === "DEPOSIT" ? deposit : withdraw;

  const handleSubmit = useSubmitOnce(async () => {
    // O motivo já está na tela; o Enter não passa por cima do botão desabilitado.
    if (blockReason) return;
    if (amount <= 0) {
      toast.error("Informe um valor válido.");
      return;
    }
    try {
      await mutation.mutate(amount);
    } catch {
      // erro já tratado via onError
    }
  });

  return (
    <DialogContent
      hideCloseButton
      className="flex flex-col gap-5"
      // Aberto por estado (sem Dialog.Trigger), o Radix não sabe para onde devolver o foco e ele
      // se perdia ao fechar: volta para o Depositar/Resgatar que abriu.
      onCloseAutoFocus={(event) => {
        event.preventDefault();
        returnFocusTo.current?.focus();
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1.5 pt-2.5">
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </div>
        <DialogClose className="-mr-2.5 -mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <X size={18} aria-hidden="true" />
          <span className="sr-only">Fechar</span>
        </DialogClose>
      </div>

      <dl className="grid grid-cols-[1fr_auto] gap-y-1.5 rounded-xl bg-secondary px-3.5 py-3 text-sm text-muted-foreground">
        <dt>Saldo em conta</dt>
        <dd className="font-semibold tabular-nums text-foreground">
          {formatCurrency(accountBalance)}
        </dd>
        <dt>Na Caixinha</dt>
        <dd className="font-semibold tabular-nums text-foreground">
          {formatCurrency(savingsBalance)}
        </dd>
      </dl>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <FormField label="Valor">
          <CurrencyDigitsField
            input={amountInput}
            ariaLabel={`Valor a ${copy.action.toLowerCase()}`}
            invalid={exceedsAvailable}
            describedBy={blockReason ? limitNoteId : undefined}
            autoFocus
          />
          {/* Avisa antes de enviar, em vez de abrir o "Saldo insuficiente" por cima deste diálogo. */}
          {blockReason && (
            <p id={limitNoteId} className="text-xs font-medium text-destructive">
              {blockReason}
            </p>
          )}
        </FormField>

        {/* Larguras iguais, principal à direita; no celular empilhados, principal em cima. */}
        <div className="flex flex-col-reverse gap-2 sm:grid sm:grid-cols-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={mutation.isPending || blockReason !== null}
            aria-describedby={blockReason ? limitNoteId : undefined}
          >
            {mutation.isPending
              ? "Enviando..."
              : amount > 0
                ? `${copy.action} ${formatCurrency(amount)}`
                : copy.action}
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}
