import { X } from "lucide-react";
import { TopUpForm } from "@/components/profile/TopUpForm";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

interface TopUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Chamado depois do depósito, para a tela recarregar o saldo. */
  onSuccess?: () => void;
  /** Valor já preenchido e a nota que o explica (ex.: o que falta para a ordem). */
  initialAmount?: number;
  note?: string;
}

// "Adicionar saldo grátis": aberto pelo card do Painel e pelo "Saldo insuficiente". O X fica
// na linha do título (o padrão do Dialog o põe no canto, solto do título).
export function TopUpDialog({
  open,
  onOpenChange,
  onSuccess,
  initialAmount,
  note,
}: TopUpDialogProps) {
  const close = () => onOpenChange(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent hideCloseButton className="flex flex-col gap-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1.5 pt-2.5">
            <DialogTitle>Adicionar saldo grátis</DialogTitle>
            <DialogDescription>
              É dinheiro simulado para praticar: não há pagamento, cartão nem cobrança.
            </DialogDescription>
          </div>
          <DialogClose className="-mr-2.5 -mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <X size={18} aria-hidden="true" />
            <span className="sr-only">Fechar</span>
          </DialogClose>
        </div>
        <TopUpForm
          autoFocus
          initialAmount={initialAmount}
          note={note}
          onCancel={close}
          onSuccess={() => {
            close();
            onSuccess?.();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
