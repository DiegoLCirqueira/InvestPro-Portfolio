import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ArrowDownUp } from "lucide-react";
import { ExchangeSkeleton } from "@/components/skeletons/ExchangeSkeleton";
import { useConvert, useExchange } from "@/hooks/useExchange";
import { ApiError } from "@/services/api";

const CURRENCY_NAMES: Record<string, string> = {
  BRL: "Real Brasileiro",
  USD: "Dólar Americano",
  EUR: "Euro",
  GBP: "Libra Esterlina",
  JPY: "Iene Japonês",
  CHF: "Franco Suíço",
  CAD: "Dólar Canadense",
  AUD: "Dólar Australiano",
  CNY: "Yuan Chinês",
};

function currencyName(code: string): string {
  return CURRENCY_NAMES[code] ?? code;
}

function formatCurrency(value: number, currency = "BRL"): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(value);
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("pt-BR");
}

export function Exchange() {
  const { currencies, base, isLoading, error, refetch } = useExchange();
  const convert = useConvert({
    onSuccess: () => toast.success("Conversão realizada com sucesso!"),
    onError: (err) =>
      toast.error(
        err instanceof ApiError && err.status === 401
          ? "Sessão expirada. Faça login novamente."
          : err.message,
      ),
  });

  const [from, setFrom] = useState(base);
  const [to, setTo] = useState(currencies[0] ?? "USD");
  const [amount, setAmount] = useState("");

  const isUnauthorized = error instanceof ApiError && error.status === 401;

  const handleSwap = () => {
    if (from !== to) {
      setFrom(to);
      setTo(from);
    }
  };

  const handleNumeric = (value: string) => {
    const cleaned = value.replace(",", ".");
    if (cleaned === "" || /^\d*\.?\d*$/.test(cleaned)) {
      setAmount(cleaned);
    }
  };

  const handleConvert = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Informe um valor válido.");
      return;
    }
    if (from === to) {
      toast.error("Selecione moedas diferentes para converter.");
      return;
    }
    try {
      await convert.mutate({ from, to, amount: value });
    } catch {
      return;
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 animate-in fade-in duration-300">
        <ExchangeSkeleton />
      </div>
    );
  }

  if (isUnauthorized) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
        <h2 className="text-xl font-bold text-white">Câmbio indisponível</h2>
        <p className="text-sm text-gray-400 text-center max-w-md">
          É necessário estar autenticado para realizar conversões de câmbio.
        </p>
        <Link
          to="/login"
          className="px-4 py-2 rounded-xl bg-brand-primary text-black text-sm font-bold hover:opacity-90 transition-opacity"
        >
          Fazer login
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
        <h2 className="text-xl font-bold text-white">
          Não foi possível carregar as moedas
        </h2>
        <p className="text-sm text-gray-400 text-center max-w-md">
          {error.message}
        </p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 rounded-xl bg-brand-primary text-black text-sm font-bold hover:opacity-90 transition-opacity"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  const result = convert.data;

  return (
    <div className="flex-1 flex flex-col min-h-0 animate-in fade-in duration-500">
      <header className="mb-6 shrink-0">
        <h2 className="text-2xl font-bold text-white mb-1">Câmbio de Moedas</h2>
        <p className="text-gray-400 text-sm">
          Converta entre moedas com as melhores taxas.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <form
          onSubmit={handleConvert}
          className="p-6 rounded-2xl border border-gray-800 bg-[#161b22] flex flex-col gap-5"
        >
          <h3 className="text-base font-bold text-white">Conversor</h3>

          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-400">Valor</label>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => handleNumeric(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#0f1318] border border-gray-700 text-white placeholder-gray-600 text-base focus:outline-none focus:border-brand-primary transition-colors duration-200 tabular-nums"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-400">De</label>
            <select
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#0f1318] border border-gray-700 text-white text-base focus:outline-none focus:border-brand-primary transition-colors duration-200 cursor-pointer"
            >
              {currencies.map((code) => (
                <option key={code} value={code} className="bg-[#0f1318]">
                  {code} — {currencyName(code)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleSwap}
              aria-label="Inverter moedas"
              className="p-2.5 rounded-xl bg-[#0f1318] border border-gray-700 text-gray-300 hover:text-white hover:border-brand-primary transition-colors cursor-pointer"
            >
              <ArrowDownUp size={18} />
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-400">Para</label>
            <select
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#0f1318] border border-gray-700 text-white text-base focus:outline-none focus:border-brand-primary transition-colors duration-200 cursor-pointer"
            >
              {currencies.map((code) => (
                <option key={code} value={code} className="bg-[#0f1318]">
                  {code} — {currencyName(code)}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={convert.isPending}
            className="w-full py-3 rounded-xl bg-brand-primary hover:opacity-90 disabled:opacity-50 transition-opacity duration-200 text-white font-bold text-sm cursor-pointer"
          >
            {convert.isPending ? "Convertendo..." : "Converter"}
          </button>
        </form>

        <div className="p-6 rounded-2xl border border-gray-800 bg-[#161b22] flex flex-col gap-4">
          <h3 className="text-base font-bold text-white">Resultado</h3>

          {!result ? (
            <p className="text-sm text-gray-500 text-center py-16">
              Preencha o valor e clique em Converter para ver o resultado.
            </p>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Você envia</span>
                  <span className="text-white font-bold tabular-nums">
                    {formatCurrency(result.amount, result.from)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Você recebe</span>
                  <span className="text-2xl font-bold text-brand-primary tabular-nums">
                    {formatCurrency(result.convertedAmount, result.to)}
                  </span>
                </div>
              </div>

              <div className="h-px bg-gray-800" />

              <div className="flex flex-col gap-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Taxa ({result.from} → {result.to})</span>
                  <span className="text-white font-semibold tabular-nums">
                    {result.rate.toFixed(4)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Taxa de serviço</span>
                  <span className="text-white font-semibold tabular-nums">
                    {formatCurrency(result.fee)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Data</span>
                  <span className="text-white font-semibold tabular-nums">
                    {formatDate(result.timestamp)}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
