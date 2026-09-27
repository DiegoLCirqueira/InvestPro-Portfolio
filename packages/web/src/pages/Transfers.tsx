import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Info, LogIn, Receipt } from "lucide-react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { TransfersSkeleton } from "@/components/skeletons/TransfersSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { StatusBadge, type StatusTone } from "@/components/StatusBadge";
import { useCreateTransfer, useTransfers } from "@/hooks/useTransfers";
import { useCurrencyDigitsInput } from "@/hooks/use-currency-digits-input";
import { useFinancialErrorHandler } from "@/hooks/use-financial-error-handler";
import { useSubmitOnce } from "@/hooks/use-submit-once";
import { ApiError } from "@/services/api";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { formatStoredPixKey } from "@/lib/pix-key";
import { usePixKeyInput } from "@/hooks/use-pix-key-input";
import { PixKeyField } from "@/components/transfers/PixKeyField";
import { segmentClassName } from "@/components/ui/segmented";
import { cn } from "@/lib/utils";
import type { Transfer, TransferStatus, TransferType } from "@/types/transfer";

const TYPE_OPTIONS: { value: TransferType; label: string }[] = [
  { value: "PIX", label: "PIX" },
  { value: "TED", label: "TED" },
  { value: "DOC", label: "DOC" },
];

const TYPE_HELP: Partial<Record<TransferType, string>> = {
  TED: "Transferência entre contas de bancos diferentes, compensada no mesmo dia útil.",
  DOC: "Transferência entre bancos diferentes, compensada em até 1 dia útil, para valores menores.",
};

const STATUS_CONFIG: Record<
  TransferStatus,
  { label: string; tone: StatusTone }
> = {
  PENDING: { label: "Pendente", tone: "warning" },
  COMPLETED: { label: "Concluída", tone: "success" },
  FAILED: { label: "Falhou", tone: "danger" },
};

// Ajuda do TED/DOC em Popover (abre e fecha no clique/toque). O Tooltip do Radix fecha no
// pointerdown do próprio gatilho e só abre com hover/foco: no celular a explicação não aparecia.
function TransferTypeHelp({ label, help }: { label: string; help: string }) {
  return (
    <PopoverPrimitive.Root>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          // O ícone fica dentro do botão do tipo (TED/DOC): o clique não pode selecioná-lo.
          onClick={(e) => e.stopPropagation()}
          aria-label={`Saiba mais sobre ${label}`}
          className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Info size={13} />
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          side="top"
          sideOffset={4}
          collisionPadding={16}
          className="z-50 max-w-64 rounded-md border border-border bg-surface-3 px-3 py-1.5 text-xs text-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
        >
          {help}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

function TransferStatusBadge({ status }: { status: TransferStatus }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING;
  return <StatusBadge label={config.label} tone={config.tone} />;
}

function destinationOf(transfer: Transfer): string {
  if (transfer.pixKey)
    return `Chave PIX · ${formatStoredPixKey(transfer.pixKey)}`;
  if (!transfer.toAccount) return "Transferência externa";
  const { bank, agency, account } = transfer.toAccount;
  return [bank, agency && `Ag. ${agency}`, account && `Conta ${account}`]
    .filter(Boolean)
    .join(" · ");
}

function TransferItem({ transfer }: { transfer: Transfer }) {
  const destination = destinationOf(transfer);

  return (
    <div className="p-4 rounded-xl border border-border bg-surface-2">
      <div className="flex items-center justify-between gap-3 mb-1">
        <div className="min-w-0">
          <span className="font-bold text-foreground tabular-nums">
            {formatCurrency(transfer.amount)}
          </span>
          <span className="text-xs text-muted-foreground ml-2 uppercase tracking-wider">
            {transfer.type}
          </span>
        </div>
        <TransferStatusBadge status={transfer.status} />
      </div>
      <p className="text-xs text-muted-foreground mb-0.5">{destination}</p>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="truncate">
          {transfer.description || "Sem descrição"}
        </span>
        <span className="tabular-nums shrink-0 ml-2">
          {formatDateTime(transfer.createdAt)}
        </span>
      </div>
    </div>
  );
}

export function Transfers() {
  const navigate = useNavigate();
  const { data, error, isLoading, refetch } = useTransfers();
  const handleFinancialError = useFinancialErrorHandler([
    "TRANSFER_INSUFFICIENT_BALANCE",
  ]);
  const createTransfer = useCreateTransfer({
    onSuccess: () => toast.success("Transferência iniciada com sucesso!"),
    onError: (err) => {
      if (err instanceof ApiError && err.code === "CPF_REQUIRED") {
        toast.error(
          "Você precisa completar seu CPF no perfil para fazer transferências.",
          {
            action: {
              label: "Completar CPF",
              onClick: () => navigate("/profile#cpf"),
            },
          },
        );
        return;
      }
      handleFinancialError(err);
    },
  });

  const [type, setType] = useState<TransferType>("PIX");
  const amountInput = useCurrencyDigitsInput();
  const [description, setDescription] = useState("");
  const [bank, setBank] = useState("");
  const [agency, setAgency] = useState("");
  const [account, setAccount] = useState("");
  const pixKeyInput = usePixKeyInput();

  const isUnauthorized = error instanceof ApiError && error.status === 401;

  const history = data?.items ?? [];

  const destinationAccount = {
    bank: bank.trim(),
    agency: agency.trim(),
    account: account.trim(),
  };
  const accountFieldsFilled =
    Object.values(destinationAccount).filter(Boolean).length;

  // Mensagem do primeiro problema do formulário, ou null se pode enviar.
  const formError = (): string | null => {
    if (amountInput.amount <= 0) return "Informe um valor válido.";
    if (type === "PIX") {
      if (pixKeyInput.isEmpty) return "Informe a chave PIX de destino.";
      if (pixKeyInput.ambiguousTypes.length > 0)
        return "Escolha se a chave é um CPF ou um celular.";
      if (!pixKeyInput.pixKey) {
        return "Chave PIX inválida. Use CPF, CNPJ, e-mail, celular com DDD ou chave aleatória.";
      }
    } else if (accountFieldsFilled > 0 && accountFieldsFilled < 3) {
      return "Preencha banco, agência e número da conta, ou deixe os três em branco.";
    }
    return null;
  };

  const resetForm = () => {
    amountInput.reset();
    setDescription("");
    setBank("");
    setAgency("");
    setAccount("");
    pixKeyInput.reset();
  };

  const submitTransfer = async () => {
    const message = formError();
    if (message) {
      toast.error(message);
      return;
    }
    const pixKey = type === "PIX" ? pixKeyInput.pixKey : null;
    try {
      await createTransfer.mutate({
        type,
        amount: amountInput.amount,
        description: description.trim() || undefined,
        toAccount:
          !pixKey && accountFieldsFilled === 3 ? destinationAccount : undefined,
        pixKey: pixKey?.value,
        pixKeyType: pixKey?.type,
      });
    } catch {
      return;
    }
    resetForm();
    void refetch();
  };

  const handleSubmit = useSubmitOnce(submitTransfer);

  if (isLoading) {
    return (
      <div className="animate-in fade-in duration-300">
        <TransfersSkeleton />
      </div>
    );
  }

  if (isUnauthorized) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[40vh]">
        <EmptyState
          icon={LogIn}
          title="Transferências indisponíveis"
          message="É necessário estar autenticado para realizar transferências."
          action={{ label: "Fazer login", to: "/login" }}
        />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title="Não foi possível carregar as transferências"
        message={error.message}
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="flex flex-col animate-in fade-in duration-500">
      <header className="mb-6 shrink-0">
        <h2 className="text-2xl font-bold text-foreground mb-1">
          Transferências Bancárias
        </h2>
        <p className="text-muted-foreground text-sm">
          Movimente dinheiro entre suas contas.
        </p>
      </header>

      <div className="grid grid-cols-1 nav:grid-cols-2 gap-4 items-start">
        <form
          onSubmit={handleSubmit}
          className="p-6 rounded-2xl border border-border bg-surface-1 flex flex-col gap-5"
        >
          <h3 className="text-base font-bold text-foreground">
            Nova Transferência
          </h3>

          <div className="flex flex-col gap-2">
            <label className="text-sm text-muted-foreground">Tipo</label>
            <div className="grid grid-cols-3 gap-2">
              {TYPE_OPTIONS.map((option) => {
                const help = TYPE_HELP[option.value];
                return (
                  <div key={option.value} className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setType(option.value);
                        if (option.value === "PIX") {
                          setBank("");
                          setAgency("");
                          setAccount("");
                        } else {
                          pixKeyInput.reset();
                        }
                      }}
                      aria-pressed={type === option.value}
                      className={segmentClassName(
                        type === option.value,
                        "primary",
                        cn("w-full", help && "pr-7"),
                      )}
                    >
                      {option.label}
                    </button>

                    {help ? (
                      <TransferTypeHelp label={option.label} help={help} />
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm text-muted-foreground">Valor</label>
            <input
              type="text"
              inputMode="numeric"
              value={amountInput.displayValue}
              onChange={amountInput.onChange}
              onPaste={amountInput.onPaste}
              aria-label="Valor da transferência"
              className="w-full px-4 py-3 rounded-xl bg-surface-2 border border-field text-foreground text-base focus:outline-none focus:border-brand-primary focus-visible:ring-2 focus-visible:ring-ring transition-colors duration-200 tabular-nums"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="transfer-description"
              className="text-sm text-muted-foreground"
            >
              Descrição (opcional)
            </label>
            <input
              id="transfer-description"
              type="text"
              value={description}
              maxLength={140}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="ex.: Pagamento de aluguel"
              className="w-full px-4 py-3 rounded-xl bg-surface-2 border border-field text-foreground placeholder-muted-foreground text-base focus:outline-none focus:border-brand-primary focus-visible:ring-2 focus-visible:ring-ring transition-colors duration-200"
            />
          </div>

          {type === "PIX" ? (
            <PixKeyField input={pixKeyInput} />
          ) : (
            <div className="flex flex-col gap-2">
              <label className="text-sm text-muted-foreground">
                Conta de Destino (opcional)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={bank}
                  onChange={(e) => setBank(e.target.value)}
                  placeholder="Banco"
                  aria-label="Banco"
                  className="col-span-2 w-full px-4 py-3 rounded-xl bg-surface-2 border border-field text-foreground placeholder-muted-foreground text-base focus:outline-none focus:border-brand-primary focus-visible:ring-2 focus-visible:ring-ring transition-colors duration-200"
                />
                <input
                  type="text"
                  inputMode="numeric"
                  value={agency}
                  onChange={(e) => setAgency(e.target.value)}
                  placeholder="Agência"
                  aria-label="Agência"
                  className="w-full px-4 py-3 rounded-xl bg-surface-2 border border-field text-foreground placeholder-muted-foreground text-base focus:outline-none focus:border-brand-primary focus-visible:ring-2 focus-visible:ring-ring transition-colors duration-200"
                />
                <input
                  type="text"
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                  placeholder="Nº da conta"
                  aria-label="Número da conta"
                  className="w-full px-4 py-3 rounded-xl bg-surface-2 border border-field text-foreground placeholder-muted-foreground text-base focus:outline-none focus:border-brand-primary focus-visible:ring-2 focus-visible:ring-ring transition-colors duration-200"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={createTransfer.isPending}
            className="min-h-11 w-full py-3 rounded-xl bg-primary-solid hover:opacity-90 disabled:opacity-50 transition-opacity duration-200 text-primary-foreground font-bold text-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {createTransfer.isPending ? "Transferindo..." : "Transferir"}
          </button>
        </form>

        {/* Mesma regra do histórico de ordens: altura máxima = a do formulário. */}
        <div className="nav:self-stretch nav:h-0 nav:min-h-full">
          <div className="nav:max-h-full p-6 rounded-2xl border border-border bg-surface-1 flex flex-col gap-4">
            <h3 className="text-base font-bold text-foreground">
              Histórico de Transferências
            </h3>

            {history.length === 0 ? (
              <EmptyState
                icon={Receipt}
                message="Suas transferências vão aparecer aqui assim que você fizer a primeira."
              />
            ) : (
              <div className="flex flex-col gap-3 nav:min-h-0 nav:overflow-y-auto pr-1 custom-scrollbar">
                {history.map((transfer) => (
                  <TransferItem key={transfer.id} transfer={transfer} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
