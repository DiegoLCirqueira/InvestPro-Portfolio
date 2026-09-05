import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { LogIn, Receipt } from "lucide-react";
import { TransfersSkeleton } from "@/components/skeletons/TransfersSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { StatusBadge, type StatusTone } from "@/components/StatusBadge";
import { useCreateTransfer, useTransfers } from "@/hooks/useTransfers";
import { ApiError } from "@/services/api";
import { formatCurrency, formatDateTime } from "@/lib/format";
import type { Transfer, TransferStatus, TransferType } from "@/types/transfer";

const TYPE_OPTIONS: { value: TransferType; label: string }[] = [
  { value: "PIX", label: "PIX" },
  { value: "TED", label: "TED" },
  { value: "DOC", label: "DOC" },
];

const STATUS_CONFIG: Record<TransferStatus, { label: string; tone: StatusTone }> =
  {
    PENDING: { label: "Pendente", tone: "warning" },
    COMPLETED: { label: "Concluída", tone: "success" },
    FAILED: { label: "Falhou", tone: "danger" },
  };

function TransferStatusBadge({ status }: { status: TransferStatus }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING;
  return <StatusBadge label={config.label} tone={config.tone} />;
}

function TransferItem({ transfer }: { transfer: Transfer }) {
  const destination = transfer.toAccount
    ? `${transfer.toAccount.bank} · Conta ${transfer.toAccount.account}`
    : "Transferência externa";

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
        <span className="truncate">{transfer.description || "Sem descrição"}</span>
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
  const createTransfer = useCreateTransfer({
    onSuccess: () => toast.success("Transferência iniciada com sucesso!"),
    onError: (err) => {
      if (err instanceof ApiError && err.status === 401) {
        toast.error("Sessão expirada. Faça login novamente.");
        return;
      }
      if (err instanceof ApiError && err.code === "CPF_REQUIRED") {
        toast.error(
          "Você precisa completar seu CPF no perfil para fazer transferências.",
          {
            action: {
              label: "Completar CPF",
              onClick: () => navigate("/profile"),
            },
          },
        );
        return;
      }
      toast.error(err.message);
    },
  });

  const [type, setType] = useState<TransferType>("PIX");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [bank, setBank] = useState("");
  const [account, setAccount] = useState("");

  const isUnauthorized = error instanceof ApiError && error.status === 401;

  const history = data?.items ?? [];

  const handleNumeric = (value: string) => {
    const cleaned = value.replace(",", ".");
    if (cleaned === "" || /^\d*\.?\d*$/.test(cleaned)) {
      setAmount(cleaned);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Informe um valor válido.");
      return;
    }
    try {
      await createTransfer.mutate({
        type,
        amount: value,
        description: description.trim() || undefined,
        toAccount:
          bank.trim() && account.trim()
            ? { bank: bank.trim(), account: account.trim() }
            : undefined,
      });
    } catch {
      return;
    }
    setAmount("");
    setDescription("");
    setBank("");
    setAccount("");
    void refetch();
  };

  if (isLoading) {
    return (
      <div className="flex-1 animate-in fade-in duration-300">
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
    <div className="flex-1 flex flex-col min-h-0 animate-in fade-in duration-500">
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
          <h3 className="text-base font-bold text-foreground">Nova Transferência</h3>

          <div className="flex flex-col gap-2">
            <label className="text-sm text-muted-foreground">Tipo</label>
            <div className="grid grid-cols-3 gap-2">
              {TYPE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setType(option.value)}
                  className={`min-h-11 py-2.5 rounded-xl border text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                    type === option.value
                      ? "bg-brand-primary text-black border-brand-primary"
                      : "bg-surface-2 text-muted-foreground border-input hover:border-border-strong"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm text-muted-foreground">Valor</label>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => handleNumeric(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-surface-2 border border-input text-foreground placeholder-muted-foreground text-base focus:outline-none focus:border-brand-primary transition-colors duration-200 tabular-nums"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm text-muted-foreground">Descrição (opcional)</label>
            <input
              type="text"
              value={description}
              maxLength={140}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="ex.: Pagamento de aluguel"
              className="w-full px-4 py-3 rounded-xl bg-surface-2 border border-input text-foreground placeholder-muted-foreground text-base focus:outline-none focus:border-brand-primary transition-colors duration-200"
            />
          </div>

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
                className="w-full px-4 py-3 rounded-xl bg-surface-2 border border-input text-foreground placeholder-muted-foreground text-base focus:outline-none focus:border-brand-primary transition-colors duration-200"
              />
              <input
                type="text"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                placeholder="Nº da conta"
                className="w-full px-4 py-3 rounded-xl bg-surface-2 border border-input text-foreground placeholder-muted-foreground text-base focus:outline-none focus:border-brand-primary transition-colors duration-200"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={createTransfer.isPending}
            className="min-h-11 w-full py-3 rounded-xl bg-brand-primary hover:opacity-90 disabled:opacity-50 transition-opacity duration-200 text-white font-bold text-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {createTransfer.isPending ? "Transferindo..." : "Transferir"}
          </button>
        </form>

        <div className="p-6 rounded-2xl border border-border bg-surface-1 flex flex-col gap-4">
          <h3 className="text-base font-bold text-foreground">
            Histórico de Transferências
          </h3>

          {history.length === 0 ? (
            <EmptyState icon={Receipt} message="Nenhuma transferência registrada ainda." />
          ) : (
            <div className="flex flex-col gap-3">
              {history.map((transfer) => (
                <TransferItem key={transfer.id} transfer={transfer} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
