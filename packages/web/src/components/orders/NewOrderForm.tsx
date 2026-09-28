import { useState } from "react";
import { SectionTitle } from "@/components/SectionTitle";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { CurrencyDigitsField } from "@/components/CurrencyDigitsField";
import { FormField, fieldInputClassName } from "@/components/FormField";
import { OrderSideToggle } from "@/components/orders/OrderSideToggle";
import { OrderSummary } from "@/components/orders/OrderSummary";
import { Combobox } from "@/components/ui/combobox";
import { useMarketAssets } from "@/hooks/use-market-assets";
import { useCreateOrder, useSellableAssets } from "@/hooks/use-orders";
import { useFinancialErrorHandler } from "@/hooks/use-financial-error-handler";
import { useOrderForm, type OrderEntryMode } from "@/hooks/use-order-form";
import { useSubmitOnce } from "@/hooks/use-submit-once";
import { formatQuantity } from "@/lib/format";
import { ORDER_TYPE_LABELS } from "@/lib/order-form";
import { segmentClassName } from "@/components/ui/segmented";
import type { OrderType } from "@/types/order";
import { Button } from "@/components/ui/button";
import { cardClassName } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const ENTRY_MODE_OPTIONS: { value: OrderEntryMode; label: string }[] = [
  { value: "QUANTITY", label: "Quantidade" },
  { value: "AMOUNT", label: "Valor em R$" },
];

const TYPE_OPTIONS = (Object.keys(ORDER_TYPE_LABELS) as OrderType[]).map(
  (value) => ({
    value,
    label: ORDER_TYPE_LABELS[value],
  }),
);

interface NewOrderFormProps {
  onCreated: () => void;
}

export function NewOrderForm({ onCreated }: NewOrderFormProps) {
  const { data: marketData, isLoading: isMarketLoading } = useMarketAssets();
  const {
    sellableAssets,
    isLoading: isSellableLoading,
    error: sellableError,
    refetch: refetchSellableAssets,
  } = useSellableAssets();

  const [searchParams] = useSearchParams();

  const form = useOrderForm({
    marketAssets: marketData?.items ?? [],
    isMarketLoading,
    sellableAssets,
    isSellableLoading,
    initialTicker: searchParams.get("ticker") ?? undefined,
  });

  const handleOrderError = useFinancialErrorHandler([
    "ORDER_INSUFFICIENT_BALANCE",
  ]);
  const createOrder = useCreateOrder({
    onSuccess: () => toast.success("Ordem criada com sucesso!"),
    onError: handleOrderError,
  });

  // Depois de uma tentativa de envio, os campos obrigatórios vazios ficam marcados na tela.
  const [showRequired, setShowRequired] = useState(false);
  const tickerRequired = showRequired && form.missingFields.ticker;
  const quantityRequired = showRequired && form.missingFields.quantity;

  const submitOrder = async () => {
    const submitError = form.findSubmitError();
    if (submitError) {
      if (form.missingFields.ticker || form.missingFields.quantity) {
        setShowRequired(true);
        return;
      }
      toast.error(submitError);
      return;
    }
    try {
      await createOrder.mutate(form.buildInput());
    } catch {
      // erro já tratado via onError
      return;
    }
    form.reset();
    setShowRequired(false);
    void refetchSellableAssets();
    onCreated();
  };

  const handleSubmit = useSubmitOnce(submitOrder);

  const isSubmitBlocked =
    createOrder.isPending ||
    form.hasNothingToSell ||
    form.quantityError !== null;

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(cardClassName, "nav:col-span-2 flex flex-col gap-5")}
    >
      <SectionTitle>Nova Ordem</SectionTitle>

      <FormField label="Lado">
        <OrderSideToggle value={form.side} onChange={form.changeSide} />
      </FormField>

      <FormField label="Ativo" htmlFor="order-ticker">
        {form.hasNothingToSell ? (
          <p className="px-4 py-3 rounded-xl border border-input bg-surface-2 text-sm text-muted-foreground">
            Você ainda não possui ativos para vender. Faça uma compra primeiro.
          </p>
        ) : (
          <>
            <Combobox
              searchable
              id="order-ticker"
              value={form.ticker}
              onValueChange={form.setTicker}
              options={form.tickerOptions}
              isLoading={form.isTickerListLoading}
              loadingMessage="Carregando ativos..."
              emptyMessage="Nenhum ativo encontrado."
              placeholder="ex.: PETR4"
              className="uppercase"
            />
            {tickerRequired && (
              <p role="alert" className="text-xs text-destructive">
                Escolha um ativo.
              </p>
            )}
            {form.isSell && sellableError && (
              <p className="text-xs text-destructive">
                Não foi possível carregar seus ativos: {sellableError.message}
              </p>
            )}
          </>
        )}
      </FormField>

      <FormField label="Tipo" htmlFor="order-type">
        <Combobox
          id="order-type"
          options={TYPE_OPTIONS}
          value={form.type}
          onValueChange={(value) => form.setType(value as OrderType)}
        />
      </FormField>

      {form.canBuyByAmount && (
        <FormField label="Comprar por">
          <div role="group" aria-label="Comprar por" className="grid grid-cols-2 gap-2">
            {ENTRY_MODE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={form.entryMode === option.value}
                onClick={() => form.setEntryMode(option.value)}
                className={segmentClassName(form.entryMode === option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </FormField>
      )}

      {form.entryMode === "AMOUNT" ? (
        <FormField label="Valor em R$" htmlFor="order-amount">
          <CurrencyDigitsField
            id="order-amount"
            input={form.amountInput}
            ariaLabel="Valor em R$"
            invalid={form.quantityError !== null || quantityRequired}
          />
          {/* A API recebe quantidade: mostra a que o valor compra (truncada em 8 casas). */}
          <p className="text-xs text-muted-foreground" aria-live="polite">
            Quantidade estimada:{" "}
            <span className="font-semibold text-foreground tabular-nums">
              {formatQuantity(form.estimatedQuantity ?? 0)} {form.ticker.toUpperCase()}
            </span>
          </p>
          {form.quantityError && (
            <p role="alert" className="text-xs text-destructive">
              {form.quantityError}
            </p>
          )}
          {quantityRequired && (
            <p role="alert" className="text-xs text-destructive">
              Informe um valor maior que R$ 0,00.
            </p>
          )}
        </FormField>
      ) : (
        <FormField label="Quantidade" htmlFor="order-quantity">
          <input
            id="order-quantity"
            type="text"
            inputMode="decimal"
            value={form.quantity}
            onChange={(e) => form.changeQuantity(e.target.value)}
            placeholder="0"
            aria-invalid={form.quantityError !== null || quantityRequired}
            className={fieldInputClassName}
          />
          {form.quantityError && (
            <p role="alert" className="text-xs text-destructive">
              {form.quantityError}
            </p>
          )}
          {quantityRequired && (
            <p role="alert" className="text-xs text-destructive">
              Informe uma quantidade maior que zero.
            </p>
          )}
        </FormField>
      )}

      <OrderSummary
        side={form.side}
        settlement={form.settlement}
        isPriceEstimated={form.isPriceEstimated}
      />

      {form.needsPrice && (
        <FormField label="Preço" htmlFor="order-price">
          <CurrencyDigitsField
            id="order-price"
            input={form.priceInput}
            ariaLabel="Preço da ordem"
          />
        </FormField>
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={isSubmitBlocked}
      >
        {createOrder.isPending ? "Enviando..." : "Enviar Ordem"}
      </Button>
    </form>
  );
}
