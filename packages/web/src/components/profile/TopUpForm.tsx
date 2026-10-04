import { useId } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { fieldInputClassName } from "@/components/FormField";
import { Button } from "@/components/ui/button";
import { segmentClassName } from "@/components/ui/segmented";
import { useCurrencyDigitsInput } from "@/hooks/use-currency-digits-input";
import { useFinancialErrorHandler } from "@/hooks/use-financial-error-handler";
import { useSubmitOnce } from "@/hooks/use-submit-once";
import {
  usePortfolioPositions,
  useTopUpLimit,
  useTopUpPortfolio,
} from "@/hooks/usePortfolio";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

// Atalhos que preenchem o campo: quem está começando não sabe quanto "treinar".
const QUICK_AMOUNTS = [
  { value: 1_000, label: "R$ 1 mil" },
  { value: 5_000, label: "R$ 5 mil" },
  { value: 50_000, label: "R$ 50 mil" },
];

interface TopUpFormProps {
  /** Chamado depois de um depósito aceito (ex.: fechar o diálogo e recarregar o Painel). */
  onSuccess?: () => void;
  /** No diálogo: mostra "Cancelar" ao lado da ação principal. */
  onCancel?: () => void;
  autoFocus?: boolean;
  /** No Perfil o botão é secundário (a página tem uma ação principal); no diálogo, é a ação. */
  submitVariant?: "default" | "outline";
  /** Valor já preenchido (ex.: o que falta para uma ordem, vindo do "Saldo insuficiente"). */
  initialAmount?: number;
  /** Explica o valor pré-preenchido, logo abaixo do campo. */
  note?: string;
}

// Formulário de "Adicionar saldo" (depósito simulado). Fica no Perfil e no diálogo "Adicionar
// saldo grátis": um só lugar com a regra do teto de depósitos, os atalhos e as mensagens.
export function TopUpForm({
  onSuccess,
  onCancel,
  autoFocus = false,
  submitVariant = "default",
  initialAmount,
  note,
}: TopUpFormProps) {
  const inputId = useId();
  const noteId = `${inputId}-note`;
  const { refetch } = usePortfolioPositions();
  const topUpLimit = useTopUpLimit();
  const amountInput = useCurrencyDigitsInput({ initialAmount });
  const remaining = topUpLimit.data?.remaining;
  const isLimitReached = remaining === 0;

  const handleTopUpError = useFinancialErrorHandler();
  const topUp = useTopUpPortfolio({ onError: handleTopUpError });

  const submitTopUp = async () => {
    const amount = amountInput.amount;
    if (amount <= 0) {
      toast.error("Informe um valor válido.");
      return;
    }
    if (remaining !== undefined && amount > remaining) {
      toast.error(`Você ainda pode adicionar até ${formatCurrency(remaining)}.`);
      return;
    }
    try {
      await topUp.mutate(amount);
    } catch {
      return; // erro já tratado via onError
    }
    // Confirma o valor e aponta o próximo passo: o saldo existe para ser investido. Fica mais
    // tempo na tela e com X (área de 24px) porque tem um link para usar.
    toast.success(`${formatCurrency(amount)} adicionados`, {
      duration: 8000,
      closeButton: true,
      classNames: { closeButton: "!size-6" },
      description: (
        <span className="flex flex-col items-start gap-1">
          Dinheiro simulado, sem cobrança.
          <Link
            to="/orders"
            className="inline-flex min-h-11 items-center gap-1 font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Fazer minha primeira ordem
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </span>
      ),
    });
    amountInput.reset();
    void refetch();
    void topUpLimit.refetch();
    onSuccess?.();
  };

  const handleSubmit = useSubmitOnce(submitTopUp);
  const amount = amountInput.amount;
  const limit = topUpLimit.data;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {limit &&
        (isLimitReached ? (
          <p className="text-sm text-muted-foreground">
            Você já adicionou o limite de saldo da conta. Agora o saldo só cresce com seus
            investimentos.
          </p>
        ) : (
          <div className="flex flex-col gap-2 text-sm">
            <p className="flex flex-wrap items-baseline justify-between gap-x-3">
              <span className="text-muted-foreground">Você ainda pode adicionar</span>
              <strong className="font-bold tabular-nums">{formatCurrency(limit.remaining)}</strong>
            </p>
            <div
              role="progressbar"
              aria-label="Limite de saldo já usado"
              aria-valuemin={0}
              aria-valuemax={limit.limit}
              aria-valuenow={limit.used}
              aria-valuetext={`${formatCurrency(limit.used)} de ${formatCurrency(limit.limit)}`}
              className="h-1.5 overflow-hidden rounded-full bg-secondary"
            >
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.min(100, (limit.used / limit.limit) * 100)}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground">
              Limite total de {formatCurrency(limit.limit)} por conta.
            </span>
          </div>
        ))}

      <div className="flex flex-col gap-2">
        <label htmlFor={inputId} className="text-sm text-muted-foreground">
          Valor
        </label>
        <input
          id={inputId}
          type="text"
          inputMode="numeric"
          value={amountInput.displayValue}
          onChange={amountInput.onChange}
          onPaste={amountInput.onPaste}
          aria-label="Valor a adicionar"
          aria-describedby={note ? noteId : undefined}
          autoFocus={autoFocus}
          disabled={isLimitReached}
          className={cn(fieldInputClassName, "tabular-nums")}
        />
        {note && (
          <span id={noteId} className="text-xs text-muted-foreground">
            {note}
          </span>
        )}
        <div role="group" aria-label="Valores rápidos" className="grid grid-cols-3 gap-2">
          {QUICK_AMOUNTS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={amount === option.value}
              // Acima do que ainda cabe no limite o atalho não serve: desabilitado, não erro depois.
              disabled={remaining !== undefined && option.value > remaining}
              onClick={() => amountInput.setAmount(option.value)}
              className={cn(
                segmentClassName(amount === option.value),
                "disabled:cursor-not-allowed disabled:opacity-50",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Com "Cancelar" (diálogo): larguras iguais, principal à direita; no celular empilhados,
          principal em cima. Sem ele (Perfil): só a ação, alinhada à direita da seção. */}
      <div
        className={
          onCancel ? "flex flex-col-reverse gap-2 sm:grid sm:grid-cols-2" : "flex justify-end"
        }
      >
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button
          type="submit"
          variant={submitVariant}
          // No Perfil (sem Cancelar), mesma regra dos botões Salvar: largura total no celular.
          className={onCancel ? undefined : "w-full sm:w-auto"}
          disabled={topUp.isPending || isLimitReached}
        >
          {topUp.isPending
            ? "Adicionando..."
            : amount > 0
              ? `Adicionar ${formatCurrency(amount)}`
              : "Adicionar saldo"}
        </Button>
      </div>
    </form>
  );
}
