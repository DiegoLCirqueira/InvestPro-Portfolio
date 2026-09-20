import { useState } from "react";
import { toast } from "sonner";
import { useFinancialErrorHandler } from "@/hooks/use-financial-error-handler";
import { useConvertExchange, useExecuteExchange } from "@/hooks/useExchange";
import { quoteKey, summaryFromExecution, summaryFromQuote } from "@/lib/exchange";
import type { ConvertResponse, ExchangeSummary } from "@/types/exchange";

// BRL debita do saldo do portfólio; as demais moedas, do saldo em carteira.
const INSUFFICIENT_BALANCE_CODES: readonly string[] = [
  "PORTFOLIO_INSUFFICIENT_BALANCE",
  "CURRENCY_HOLDING_INSUFFICIENT_BALANCE",
];

interface ExchangeInput {
  from: string;
  to: string;
  amount: number;
}

interface UseExchangeFlowOptions {
  input: ExchangeInput;
  onExecuted: () => void;
}

/**
 * Câmbio em dois passos: simular (só calcula) e depois realizar (debita/credita).
 * A simulação só vale enquanto valor, De e Para continuam iguais aos simulados;
 * mudou qualquer um, ela deixa de existir e é preciso simular de novo.
 */
export function useExchangeFlow({ input, onExecuted }: UseExchangeFlowOptions) {
  const handleError = useFinancialErrorHandler(INSUFFICIENT_BALANCE_CODES);
  const convert = useConvertExchange({ onError: handleError });
  const execute = useExecuteExchange({ onError: handleError });

  const [quote, setQuote] = useState<{ key: string; response: ConvertResponse } | null>(null);
  const [executed, setExecuted] = useState<ExchangeSummary | null>(null);

  const currentKey = quoteKey(input.from, input.to, input.amount);

  // Descarta a simulação NO MOMENTO da mudança. Só comparar a chave esconderia o resultado, mas
  // ele reapareceria (com a cotação antiga) ao voltar ao valor/De/Para anterior. Ajustar o estado
  // durante a renderização é o padrão do React para reagir a uma mudança de props.
  const [lastKey, setLastKey] = useState(currentKey);
  if (lastKey !== currentKey) {
    setLastKey(currentKey);
    setQuote(null);
  }

  // A chave também protege a simulação em andamento: uma resposta que chega depois da mudança não vale.
  const activeQuote = quote?.key === currentKey ? quote.response : null;

  const findInputError = (): string | null => {
    if (input.amount <= 0) return "Informe um valor válido.";
    if (input.from === input.to) return "Selecione moedas diferentes para converter.";
    return null;
  };

  const simulate = async () => {
    const inputError = findInputError();
    if (inputError) {
      toast.error(inputError);
      return;
    }
    try {
      const response = await convert.mutate(input);
      setQuote({ key: currentKey, response });
      setExecuted(null);
    } catch {
      // erro já tratado via onError
    }
  };

  const executeQuote = async () => {
    if (!activeQuote) return;
    try {
      const response = await execute.mutate({
        from: activeQuote.from,
        to: activeQuote.to,
        amount: activeQuote.amount,
      });
      setExecuted(summaryFromExecution(response));
      setQuote(null);
      toast.success("Câmbio realizado com sucesso!");
      onExecuted();
    } catch {
      // erro já tratado via onError
    }
  };

  return {
    simulation: activeQuote ? summaryFromQuote(activeQuote) : null,
    executed,
    simulate,
    executeQuote,
    isSimulating: convert.isPending,
    isExecuting: execute.isPending,
  };
}
