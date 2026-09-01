export interface NewsItem {
  id: number;
  category: string;
  title: string;
  time: string;
  impact: string;
  description: string;
}

export const NEWS_DATA: NewsItem[] = [
  {
    id: 1,
    category: "Mercado",
    title: "Banco Central sinaliza manutenção da taxa Selic no próximo trimestre",
    time: "há 10 min",
    impact: "Alta",
    description:
      "Em ata divulgada hoje, o Copom reforçou a necessidade de vigilância diante da inflação persistente.",
  },
  {
    id: 2,
    category: "Empresas",
    title: "Petrobras (PETR4) anuncia dividendos recordes de R$ 24 bilhões",
    time: "há 45 min",
    impact: "Alta",
    description:
      "Acionistas receberão o pagamento em duas parcelas iguais nos meses de maio e junho.",
  },
  {
    id: 3,
    category: "EUA",
    title: "Inflação nos Estados Unidos vem abaixo do esperado em Fevereiro",
    time: "há 2 horas",
    impact: "Média",
    description:
      "O índice de preços ao consumidor (CPI) subiu apenas 0.2%, animando as bolsas de Nova York.",
  },
  {
    id: 4,
    category: "Tech",
    title: "Nvidia alcança novo topo histórico com avanço em chips de IA",
    time: "há 4 horas",
    impact: "Média",
    description:
      "A demanda por hardware para inteligência artificial continua impulsionando o setor de tecnologia.",
  },
];
