import { Lightbulb } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";

type TagColor = "brand-secondary" | "brand-primary" | "brand-danger";

interface Recommendation {
  id: number;
  title: string;
  description: string;
  category: string;
  tagColor: TagColor;
}

// Conteúdo ILUSTRATIVO: não vem de nenhuma análise nem do perfil do usuário.
const EXAMPLE_RECOMMENDATIONS: Recommendation[] = [
  {
    id: 1,
    title: "Considere diversificar em REITs",
    description: "Fundos imobiliários podem equilibrar um portfólio concentrado em poucos ativos",
    category: "Diversificação",
    tagColor: "brand-secondary",
  },
  {
    id: 2,
    title: "Momento favorável para ações de tecnologia",
    description: "Análise técnica indica tendência de alta no setor",
    category: "Oportunidade",
    tagColor: "brand-primary",
  },
  {
    id: 3,
    title: "Reduzir exposição em commodities",
    description: "Volatilidade elevada prevista para os próximos meses",
    category: "Risco",
    tagColor: "brand-danger",
  },
  {
    id: 4,
    title: "Títulos do Tesouro para reserva de emergência",
    description: "Rentabilidade em alta e liquidez diária costumam combinar com uma reserva de emergência",
    category: "Oportunidade",
    tagColor: "brand-primary",
  },
  {
    id: 5,
    title: "Considerar ETFs internacionais para proteção cambial",
    description: "Exposição ao dólar pode proteger o patrimônio em cenário de incerteza",
    category: "Diversificação",
    tagColor: "brand-secondary",
  },
];

const TAG_STYLES: Record<TagColor, string> = {
  "brand-secondary": "bg-brand-secondary/80 text-white",
  "brand-primary": "bg-primary-solid text-primary-foreground",
  "brand-danger": "bg-destructive-solid text-destructive-foreground",
};

export function Recommendations() {
  return (
    <div className="flex flex-col animate-in fade-in duration-500">
      <header className="mb-8">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-2">
          <div className="flex items-center gap-2">
            <Lightbulb size={24} className="text-brand-primary" />
            <h2 className="text-2xl font-bold text-foreground">Exemplos de recomendações</h2>
          </div>
          <StatusBadge label="Exemplo" tone="warning" />
        </div>
        <p role="note" className="text-muted-foreground text-sm">
          Conteúdo ilustrativo, para mostrar como as recomendações aparecerão. Não é uma recomendação
          personalizada nem uma recomendação de investimento.
        </p>
      </header>

      <div className="space-y-4">
        {EXAMPLE_RECOMMENDATIONS.map((rec) => (
          <article
            key={rec.id}
            className="bg-surface-1 border border-border p-5 rounded-2xl"
          >
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-foreground mb-2">{rec.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{rec.description}</p>
              </div>
              <span
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${TAG_STYLES[rec.tagColor]}`}
              >
                {rec.category}
              </span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
