import { useState } from "react";
import { useCurrencyDigitsInput } from "@/hooks/use-currency-digits-input";
import { isEstimatedPrice } from "@/lib/market";
import { computeOrderSettlement } from "@/lib/order-fee";
import {
  buildTickerOptions,
  findOwnedQuantity,
  getBuyQuantityError,
  getSellQuantityError,
  normalizeTicker,
  quantityForAmount,
  sanitizeDecimalInput,
} from "@/lib/order-form";
import type { MarketAsset } from "@/types/market";
import type {
  CreateOrderInput,
  OrderSide,
  OrderType,
  SellableAsset,
} from "@/types/order";

/** Como a compra é informada: pela quantidade de unidades ou pelo valor em R$ (só cripto). */
export type OrderEntryMode = "QUANTITY" | "AMOUNT";

interface UseOrderFormOptions {
  marketAssets: MarketAsset[];
  isMarketLoading: boolean;
  sellableAssets: SellableAsset[];
  isSellableLoading: boolean;
  /** Ativo já escolhido ao abrir (ex.: vindo do clique no Mercado). */
  initialTicker?: string;
}

/**
 * Estado e regras do formulário de nova ordem: o que dá pra escolher em cada
 * lado (BUY = mercado, SELL = posições do usuário), limite de quantidade na
 * venda e o quanto a taxa da InvestPro pesa no valor final.
 */
export function useOrderForm({
  marketAssets,
  isMarketLoading,
  sellableAssets,
  isSellableLoading,
  initialTicker = "",
}: UseOrderFormOptions) {
  const [ticker, setTicker] = useState(initialTicker);
  const [side, setSide] = useState<OrderSide>("BUY");
  const [type, setType] = useState<OrderType>("MARKET");
  const [quantity, setQuantity] = useState("");
  // Padrão "Valor" para cripto: ninguém pensa em "0,00025 BTC", e sim em "R$ 100 de BTC".
  const [entryMode, setEntryMode] = useState<OrderEntryMode>("AMOUNT");
  const priceInput = useCurrencyDigitsInput();
  const amountInput = useCurrencyDigitsInput();

  const normalizedTicker = normalizeTicker(ticker);
  const needsPrice = type === "LIMIT" || type === "STOP";
  const isSell = side === "SELL";

  const tickerOptions = buildTickerOptions(side, marketAssets, sellableAssets);
  const isTickerListLoading = isSell ? isSellableLoading : isMarketLoading;
  const hasNothingToSell =
    isSell && !isSellableLoading && sellableAssets.length === 0;

  const ownedQuantity = isSell
    ? findOwnedQuantity(sellableAssets, normalizedTicker)
    : null;
  const selectedAsset = marketAssets.find(
    (asset) => normalizeTicker(asset.ticker) === normalizedTicker,
  );

  // Compra por valor só para cripto (fracionável); ações e renda fixa seguem em unidades inteiras.
  const canBuyByAmount = !isSell && selectedAsset?.type === "CRYPTO";
  const isByAmount = canBuyByAmount && entryMode === "AMOUNT";
  // Em LIMIT/STOP a conta usa o preço informado (é a ele que a ordem será avaliada); sem ele
  // ainda preenchido, o preço de mercado dá a estimativa.
  const referencePrice =
    needsPrice && priceInput.amount > 0 ? priceInput.amount : (selectedAsset?.price ?? 0);

  const quantityValue = isByAmount
    ? quantityForAmount(amountInput.amount, referencePrice)
    : Number(quantity);
  const hasValidQuantity = Number.isFinite(quantityValue) && quantityValue > 0;
  // Valor digitado, mas pequeno demais para a menor fração (8 casas) do ativo.
  const isAmountTooSmall = isByAmount && amountInput.amount > 0 && !hasValidQuantity;

  const quantityError = isAmountTooSmall
    ? `Valor baixo demais para comprar uma fração de ${normalizedTicker}.`
    : !hasValidQuantity
      ? null
      : isSell
        ? getSellQuantityError(quantityValue, ownedQuantity, normalizedTicker)
        : getBuyQuantityError(quantityValue, selectedAsset);
  const settlement =
    selectedAsset && hasValidQuantity
      ? computeOrderSettlement(side, quantityValue * referencePrice)
      : null;

  const changeSide = (nextSide: OrderSide) => {
    setSide(nextSide);
    const nextOptions = buildTickerOptions(
      nextSide,
      marketAssets,
      sellableAssets,
    );
    const isNextListLoading =
      nextSide === "SELL" ? isSellableLoading : isMarketLoading;
    const isStillValid = nextOptions.some(
      (option) => normalizeTicker(option.value) === normalizedTicker,
    );
    if (!isNextListLoading && !isStillValid) setTicker("");
  };

  const changeQuantity = (raw: string) => {
    const sanitized = sanitizeDecimalInput(raw);
    if (sanitized !== null) setQuantity(sanitized);
  };

  const reset = () => {
    setTicker("");
    setSide("BUY");
    setType("MARKET");
    setQuantity("");
    setEntryMode("AMOUNT");
    priceInput.reset();
    amountInput.reset();
  };

  /** Mensagem do primeiro problema que impede o envio, ou null se está ok. */
  const findSubmitError = (): string | null => {
    if (quantityError) return quantityError;
    if (!normalizedTicker || !hasValidQuantity) {
      return "Informe um ticker e uma quantidade válida.";
    }
    if (isSell && ownedQuantity === null) {
      return `Você não possui ${normalizedTicker}. Escolha um ativo da lista.`;
    }
    if (needsPrice && priceInput.amount <= 0) {
      return "Preencha um preço válido para este tipo de ordem.";
    }
    return null;
  };

  const buildInput = (): CreateOrderInput => ({
    ticker: normalizedTicker,
    side,
    type,
    quantity: quantityValue,
    price: needsPrice ? priceInput.amount : undefined,
  });

  return {
    ticker,
    setTicker,
    side,
    changeSide,
    type,
    setType,
    quantity,
    changeQuantity,
    canBuyByAmount,
    entryMode: (isByAmount ? "AMOUNT" : "QUANTITY") as OrderEntryMode,
    setEntryMode,
    amountInput,
    /** Quantidade calculada a partir do valor (modo AMOUNT), já truncada; null no modo quantidade. */
    estimatedQuantity: isByAmount ? quantityValue : null,
    priceInput,
    needsPrice,
    isSell,
    tickerOptions,
    isTickerListLoading,
    hasNothingToSell,
    ownedQuantity,
    quantityError,
    /** Campos obrigatórios ainda vazios: marcados na tela quando o envio é tentado. */
    missingFields: {
      ticker: !normalizedTicker,
      quantity: !hasValidQuantity && !isAmountTooSmall,
    },
    settlement,
    isPriceEstimated:
      selectedAsset !== undefined && isEstimatedPrice(selectedAsset),
    findSubmitError,
    buildInput,
    reset,
  };
}
