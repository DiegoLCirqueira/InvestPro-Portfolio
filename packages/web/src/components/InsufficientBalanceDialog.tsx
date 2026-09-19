import { AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useInsufficientBalanceStore } from "@/stores/insufficient-balance";

export function InsufficientBalanceDialog() {
  const isOpen = useInsufficientBalanceStore((s) => s.isOpen);
  const close = useInsufficientBalanceStore((s) => s.close);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent
        hideCloseButton
        onClick={close}
        className="flex max-w-sm flex-col items-center gap-3 text-center cursor-pointer"
      >
        <AlertTriangle size={32} className="text-destructive" aria-hidden="true" />
        <DialogTitle className="text-foreground font-semibold text-lg">
          Saldo insuficiente
        </DialogTitle>
        <p className="text-sm text-muted-foreground">
          Essa ação deixaria seu saldo negativo. Ajuste o valor ou adicione fundos
          para continuar.
        </p>
      </DialogContent>
    </Dialog>
  );
}
