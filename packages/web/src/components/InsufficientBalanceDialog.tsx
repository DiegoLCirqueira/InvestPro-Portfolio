import { useState } from "react";
import { AlertTriangle, Plus } from "lucide-react";
import { TopUpDialog } from "@/components/TopUpDialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  missingAmount,
  shortfallAdjustLabel,
  shortfallCostSentence,
  shortfallHoldings,
  shortfallNote,
  type BalanceShortfall,
} from "@/lib/balance-shortfall";
import { formatCurrency } from "@/lib/format";
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

// Faltou saldo em conta numa ordem, câmbio ou transferência: diz quanto falta e resolve ali
// mesmo, abrindo o "Adicionar saldo grátis" já preenchido. Caixinha e moeda estrangeira não
// passam shortfall (adicionar saldo em conta não resolve) e mantêm a mensagem com "Entendi".
export function InsufficientBalanceDialog() {
  const isOpen = useInsufficientBalanceStore((s) => s.isOpen);
  const code = useInsufficientBalanceStore((s) => s.code);
  const shortfall = useInsufficientBalanceStore((s) => s.shortfall);
  const close = useInsufficientBalanceStore((s) => s.close);
  // O que falta fica guardado para o diálogo de adicionar saldo, que abre depois deste fechar.
  const [topUpFor, setTopUpFor] = useState<BalanceShortfall | null>(null);

  const missing = shortfall ? missingAmount(shortfall) : 0;
  const message = (code && MESSAGE_BY_CODE[code]) || DEFAULT_MESSAGE;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
        <DialogContent
          hideCloseButton
          className="flex max-w-sm flex-col items-center gap-3 text-center"
        >
          <AlertTriangle size={32} className="text-destructive" aria-hidden="true" />
          <DialogTitle className="text-foreground font-semibold text-lg">
            Saldo insuficiente
          </DialogTitle>
          {shortfall && missing > 0 ? (
            <>
              <DialogDescription>
                {shortfallCostSentence(shortfall)} e você tem {shortfallHoldings(shortfall)}.
                Faltam{" "}
                <strong className="font-semibold text-foreground">{formatCurrency(missing)}</strong>.
              </DialogDescription>
              {/* Empilhadas e em largura total (rótulos longos): principal em cima. */}
              <div className="mt-2 flex w-full flex-col gap-2">
                <Button
                  onClick={() => {
                    setTopUpFor(shortfall);
                    close();
                  }}
                >
                  <Plus aria-hidden="true" />
                  Adicionar saldo grátis
                </Button>
                <DialogClose asChild>
                  <Button variant="outline">{shortfallAdjustLabel(shortfall)}</Button>
                </DialogClose>
              </div>
            </>
          ) : (
            <>
              <DialogDescription>{message}</DialogDescription>
              <DialogClose asChild>
                <Button className="mt-2 w-full">Entendi</Button>
              </DialogClose>
            </>
          )}
        </DialogContent>
      </Dialog>

      {topUpFor && (
        <TopUpDialog
          open
          onOpenChange={(open) => !open && setTopUpFor(null)}
          initialAmount={missingAmount(topUpFor)}
          note={shortfallNote(topUpFor)}
          onSuccess={topUpFor.onBalanceAdded}
        />
      )}
    </>
  );
}
