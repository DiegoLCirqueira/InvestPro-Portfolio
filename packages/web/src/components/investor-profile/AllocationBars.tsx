import { CATEGORY_COLORS } from "@/lib/allocation";
import type { AllocationType } from "@/types/investor-profile";

export interface AllocationBarRow {
  type: AllocationType;
  label: string;
  targetPct: number;
  /** Sem ele, a barra mostra só a referência; com ele, a barra é o atual e a referência vira um marcador. */
  currentPct?: number;
}

const formatPct = (value: number) => `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

export function AllocationBars({ rows }: { rows: AllocationBarRow[] }) {
  return (
    <ul className="space-y-4">
      {rows.map((row) => {
        const hasCurrent = row.currentPct !== undefined;
        const fillPct = row.currentPct ?? row.targetPct;
        return (
          <li key={row.type} className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="flex items-center gap-2 font-medium text-foreground">
                <span
                  aria-hidden="true"
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: CATEGORY_COLORS[row.type] }}
                />
                {row.label}
              </span>
              <span className="tabular-nums text-muted-foreground">
                {hasCurrent ? (
                  <>
                    <span className="font-semibold text-foreground">{formatPct(fillPct)}</span>
                    {" "}· referência {formatPct(row.targetPct)}
                  </>
                ) : (
                  <span className="font-semibold text-foreground">{formatPct(row.targetPct)}</span>
                )}
              </span>
            </div>
            <div aria-hidden="true" className="relative h-2 rounded-full bg-surface-3">
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.min(fillPct, 100)}%`, backgroundColor: CATEGORY_COLORS[row.type] }}
              />
              {hasCurrent && (
                <span
                  className="absolute -top-1 h-4 w-0.5 -translate-x-1/2 rounded-full bg-foreground"
                  style={{ left: `${row.targetPct}%` }}
                />
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
