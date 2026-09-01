import { Sparkles } from "lucide-react";

type TagColor = "brand-secondary" | "brand-primary" | "brand-danger";

interface Recommendation {
  id: number;
  title: string;
  description: string;
  category: string;
  score: number;
  tagColor: TagColor;
}

const RECOMMENDATIONS: Recommendation[] = [
  {
    id: 1,
    title: "Considere diversificar em REITs",
    description:
      "Baseado no seu perfil, fundos imobiliários podem equilibrar seu portfólio",
    category: "Diversificação",
    score: 85,
    tagColor: "brand-secondary",
  },
  {
    id: 2,
    title: "Momento favorável para ações de tecnologia",
    description: "Análise técnica indica tendência de alta no setor",
    category: "Oportunidade",
    score: 72,
    tagColor: "brand-primary",
  },
  {
    id: 3,
    title: "Reduzir exposição em commodities",
    description:
      "Volatilidade elevada prevista para os próximos meses",
    category: "Risco",
    score: 68,
    tagColor: "brand-danger",
  },
  {
    id: 4,
    title: "Títulos do Tesouro para reserva de emergência",
    description:
      "Rentabilidade em alta e liquidez diária adequada ao seu perfil",
    category: "Oportunidade",
    score: 78,
    tagColor: "brand-primary",
  },
  {
    id: 5,
    title: "Considerar ETFs internacionais para proteção cambial",
    description:
      "Exposição ao dólar pode proteger seu patrimônio em cenário de incerteza",
    category: "Diversificação",
    score: 82,
    tagColor: "brand-secondary",
  },
];

const TAG_STYLES: Record<TagColor, string> = {
  "brand-secondary": "bg-brand-secondary/80 text-white",
  "brand-primary": "bg-brand-primary/80 text-white",
  "brand-danger": "bg-brand-danger/80 text-white",
};

export function Recommendations() {
  return (
    <div className="flex-1 flex flex-col min-h-0 animate-in fade-in duration-500">
      <header className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={24} className="text-brand-primary" />
          <h2 className="text-2xl font-bold text-white">
            Recomendações de IA
          </h2>
        </div>
        <p className="text-gray-400 text-sm">
          Sugestões personalizadas geradas pela inteligência artificial do
          InvestPro com base no seu perfil e no mercado.
        </p>
      </header>

      <div className="space-y-4">
        {RECOMMENDATIONS.map((rec) => (
          <div
            key={rec.id}
            className="bg-[#161b22] border border-gray-800 p-5 rounded-2xl hover:border-brand-primary/50 transition-all cursor-pointer group"
          >
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-brand-primary transition-colors">
                  {rec.title}
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {rec.description}
                </p>
              </div>
              <span
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${TAG_STYLES[rec.tagColor]}`}
              >
                {rec.category} {rec.score}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
