import { StatusBadge } from "@/components/StatusBadge";

export function EstimatedPriceTag() {
  return (
    <StatusBadge
      label="estimado"
      tone="warning"
      title="Preço estimado: a fonte de cotações está indisponível"
    />
  );
}
