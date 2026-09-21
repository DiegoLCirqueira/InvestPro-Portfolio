import { toast } from "sonner";
import { CurrencyDigitsField } from "@/components/CurrencyDigitsField";
import { FormField, fieldInputClassName } from "@/components/FormField";
import { OrderSideToggle } from "@/components/orders/OrderSideToggle";
import { OrderSummary } from "@/components/orders/OrderSummary";
import { Combobox } from "@/components/ui/combobox";
import { useMarketAssets } from "@/hooks/use-market-assets";
import { useCreateOrder, useSellableAssets } from "@/hooks/use-orders";
import { useFinancialErrorHandler } from "@/hooks/use-financial-error-handler";
import { useOrderForm } from "@/hooks/use-order-form";
import { useSubmitOnce } from "@/hooks/use-submit-once";
import type { OrderType } from "@/types/order";

const TYPE_OPTIONS: { value: OrderType; label: string }[] = [
  { value: "MARKET", label: "Mercado" },
  { value: "LIMIT", label: "Limitada" },
  { value: "STOP", label: "Stop" },
];

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

  const form = useOrderForm({
    marketAssets: marketData?.items ?? [],
    isMarketLoading,
    sellableAssets,
    isSellableLoading,
  });

  const handleOrderError = useFinancialErrorHandler(["ORDER_INSUFFICIENT_BALANCE"]);
  const createOrder = useCreateOrder({
    onSuccess: () => toast.success("Ordem criada com sucesso!"),
    onError: handleOrderError,
  });

  const submitOrder = async () => {
    const submitError = form.findSubmitError();
    if (submitError) {
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
    void refetchSellableAssets();
    onCreated();
  };

  const handleSubmit = useSubmitOnce(submitOrder);

  const isSubmitBlocked =
    createOrder.isPending || form.hasNothingToSell || form.quantityError !== null;

  return (
    <form
      onSubmit={handleSubmit}
      className="nav:col-span-2 p-6 rounded-2xl border border-border bg-surface-1 flex flex-col gap-5"
    >
      <h3 className="text-base font-bold text-foreground">Nova Ordem</h3>

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

      <FormField label="Quantidade" htmlFor="order-quantity">
        <input
          id="order-quantity"
          type="text"
          inputMode="decimal"
          value={form.quantity}
          onChange={(e) => form.changeQuantity(e.target.value)}
          placeholder="0"
          aria-invalid={form.quantityError !== null}
          className={fieldInputClassName}
        />
        {form.quantityError && (
          <p role="alert" className="text-xs text-destructive">
            {form.quantityError}
          </p>
        )}
      </FormField>

      <OrderSummary side={form.side} settlement={form.settlement} isPriceEstimated={form.isPriceEstimated} />

      {form.needsPrice && (
        <FormField label="Preço" htmlFor="order-price">
          <CurrencyDigitsField
            id="order-price"
            input={form.priceInput}
            ariaLabel="Preço da ordem"
          />
        </FormField>
      )}

      <button
        type="submit"
        disabled={isSubmitBlocked}
        className="min-h-11 w-full py-3 rounded-xl bg-primary-solid hover:opacity-90 disabled:opacity-50 transition-opacity duration-200 text-primary-foreground font-bold text-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {createOrder.isPending ? "Enviando..." : "Enviar Ordem"}
      </button>
    </form>
  );
}
