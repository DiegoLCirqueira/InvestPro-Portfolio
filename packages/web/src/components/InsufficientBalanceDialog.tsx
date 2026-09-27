import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useInsufficientBalanceStore } from "@/stores/insufficient-balance";

const DEFAULT_MESSAGE =
  "Essa ação deixaria seu saldo em conta negativo. Ajuste o valor ou adicione saldo para continuar.";

// Quando o saldo que faltou não é o da conta, a mensagem diz qual foi.
const MESSAGE_BY_CODE: Record<string, string> = {
  SAVINGS_BOX_INSUFFICIENT_BALANCE:
    "O valor é maior do que o que está guardado nesta caixinha. Ajuste o valor do resgate.",
  CURRENCY_HOLDING_INSUFFICIENT_BALANCE:
    "Você não tem esse valor na moeda de origem. Ajuste o valor ou converta mais saldo antes.",
};

export function InsufficientBalanceDialog() {
  const isOpen = useInsufficientBalanceStore((s) => s.isOpen);
  const code = useInsufficientBalanceStore((s) => s.code);
  const close = useInsufficientBalanceStore((s) => s.close);
  const message = (code && MESSAGE_BY_CODE[code]) || DEFAULT_MESSAGE;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent
        hideCloseButton
        className="flex w-[calc(100%-2rem)] max-w-sm flex-col items-center gap-3 text-center"
      >
        <AlertTriangle
          size={32}
          className="text-destructive"
          aria-hidden="true"
        />
        <DialogTitle className="text-foreground font-semibold text-lg">
          Saldo insuficiente
        </DialogTitle>
        <DialogDescription className="text-sm text-muted-foreground">
          {message}
        </DialogDescription>
        <DialogClose asChild>
          <Button className="mt-2 h-11 w-full">Entendi</Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}
