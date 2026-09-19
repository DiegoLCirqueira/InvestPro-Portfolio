import { useState } from "react";
import { useCurrencyDigitsInput } from "@/hooks/use-currency-digits-input";
import { computeOrderSettlement } from "@/lib/order-fee";
import {
  buildTickerOptions,
  findOwnedQuantity,
  getSellQuantityError,
  normalizeTicker,
  sanitizeDecimalInput,
} from "@/lib/order-form";
import type { MarketAsset } from "@/types/market";
import type {
  CreateOrderInput,
  OrderSide,
  OrderType,
  SellableAsset,
} from "@/types/order";

interface UseOrderFormOptions {
  marketAssets: MarketAsset[];
  isMarketLoading: boolean;
  sellableAssets: SellableAsset[];
  isSellableLoading: boolean;
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
}: UseOrderFormOptions) {
  const [ticker, setTicker] = useState("");
  const [side, setSide] = useState<OrderSide>("BUY");
  const [type, setType] = useState<OrderType>("MARKET");
  const [quantity, setQuantity] = useState("");
  const priceInput = useCurrencyDigitsInput();

  const normalizedTicker = normalizeTicker(ticker);
  const quantityValue = Number(quantity);
  const hasValidQuantity = Number.isFinite(quantityValue) && quantityValue > 0;
  const needsPrice = type === "LIMIT" || type === "STOP";
  const isSell = side === "SELL";

  const tickerOptions = buildTickerOptions(side, marketAssets, sellableAssets);
  const isTickerListLoading = isSell ? isSellableLoading : isMarketLoading;
  const hasNothingToSell =
    isSell && !isSellableLoading && sellableAssets.length === 0;

  const ownedQuantity = isSell
    ? findOwnedQuantity(sellableAssets, normalizedTicker)
    : null;
  const quantityError =
    isSell && hasValidQuantity
      ? getSellQuantityError(quantityValue, ownedQuantity, normalizedTicker)
      : null;

  const selectedAsset = marketAssets.find(
    (asset) => normalizeTicker(asset.ticker) === normalizedTicker,
  );
  const settlement =
    selectedAsset && hasValidQuantity
      ? computeOrderSettlement(side, quantityValue * selectedAsset.price)
      : null;

  const changeSide = (nextSide: OrderSide) => {
    setSide(nextSide);
    const nextOptions = buildTickerOptions(nextSide, marketAssets, sellableAssets);
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
    priceInput.reset();
  };

  /** Mensagem do primeiro problema que impede o envio, ou null se está ok. */
  const findSubmitError = (): string | null => {
    if (!normalizedTicker || !hasValidQuantity) {
      return "Informe um ticker e uma quantidade válida.";
    }
    if (isSell && ownedQuantity === null) {
      return `Você não possui ${normalizedTicker}. Escolha um ativo da lista.`;
    }
    if (quantityError) return quantityError;
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
    priceInput,
    needsPrice,
    isSell,
    tickerOptions,
    isTickerListLoading,
    hasNothingToSell,
    ownedQuantity,
    quantityError,
    settlement,
    findSubmitError,
    buildInput,
    reset,
  };
}
