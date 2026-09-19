// @investpro/shared
// Precisão decimal de valores de entrada (dinheiro, quantidades). As colunas
// numéricas do banco têm escala fixa: um valor com mais casas seria arredondado
// pelo Postgres, e o arredondamento silencioso é como se cria/destrói saldo.

// Ruído de ponto flutuante aceito, como fração da última casa permitida
// (0.1 + 0.2 = 0.30000000000000004 passa; 0.005 com 2 casas não).
const NOISE_FRACTION_OF_LAST_PLACE = 1e-6;

export function hasAtMostDecimalPlaces(value: number, places: number): boolean {
  const rounded = Number(value.toFixed(places));
  return Math.abs(value - rounded) < NOISE_FRACTION_OF_LAST_PLACE * 10 ** -places;
}
