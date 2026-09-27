// Folga do eixo Y do patrimônio: pelo menos 2,5% do valor para cada lado. Com o eixo "auto",
// uma variação de ~1% ocupava a altura inteira do gráfico e parecia um penhasco.
const MIN_PADDING_RATIO = 0.025;
const TICK_INTERVALS = 4;

// Passo "redondo" (1, 2, 2,5 ou 5 × 10^n) mais próximo acima do passo bruto.
function niceStep(raw: number): number {
  const power = 10 ** Math.floor(Math.log10(raw));
  const fraction = raw / power;
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10;
  return nice * power;
}

// Casas decimais que o passo precisa (0,25 → 2), até 2: marcas vizinhas nunca saem iguais.
function decimalsFor(step: number): number {
  for (let decimals = 0; decimals < 2; decimals++) {
    const scaled = step * 10 ** decimals;
    if (Math.abs(scaled - Math.round(scaled)) < 1e-9) return decimals;
  }
  return 2;
}

export interface EvolutionAxis {
  domain: [number, number];
  ticks: number[];
  format: (value: number) => string;
}

/**
 * Eixo Y do patrimônio: domínio com folga e marcas em valores redondos, com rótulos compactos
 * em pt-BR ("R$ 10,2 mil", "R$ 2,5 mi"). Não desce abaixo de zero numa série sem negativos.
 */
export function evolutionAxis(min: number, max: number): EvolutionAxis {
  const padding = Math.max((max - min) * 0.1, Math.abs(max) * MIN_PADDING_RATIO, 1);
  const step = niceStep((max - min + 2 * padding) / TICK_INTERVALS);
  const rawLower = Math.floor((min - padding) / step) * step;
  const lower = min >= 0 ? Math.max(0, rawLower) : rawLower;
  const upper = Math.ceil((max + padding) / step) * step;
  const ticks: number[] = [];
  for (let i = 0; lower + i * step <= upper + step / 2; i++) {
    ticks.push(Math.round((lower + i * step) * 100) / 100);
  }

  const magnitude = Math.max(Math.abs(lower), Math.abs(upper));
  const unit = magnitude >= 1_000_000 ? 1_000_000 : magnitude >= 1_000 ? 1_000 : 1;
  const formatter = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    ...(unit > 1 ? { notation: "compact" as const } : {}),
    minimumFractionDigits: 0,
    maximumFractionDigits: decimalsFor(step / unit),
  });

  return { domain: [lower, upper], ticks, format: (value) => formatter.format(value) };
}
