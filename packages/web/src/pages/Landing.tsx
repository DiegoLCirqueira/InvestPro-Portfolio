import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  Check,
  ChartLine,
  ChartPie,
  Compass,
  DollarSign,
  Lightbulb,
  Newspaper,
  PiggyBank,
  Shield,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { HeroPreview } from "@/components/landing/HeroPreview";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LANDING_CONTAINER, LANDING_EYEBROW } from "@/components/landing/layout";
import { Button } from "@/components/ui/button";
import { cardClassName } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
}

const HERO_CHECKS = ["Saldo simulado grátis", "Sem cartão", "Cotações reais do mercado"];

const DIFFERENTIALS: Feature[] = [
  {
    icon: Wallet,
    title: "Saldo grátis, sem cartão",
    description:
      "Adicione saldo simulado quando quiser, sem pagar nada. Teste carteiras pequenas ou grandes.",
  },
  {
    icon: ChartLine,
    title: "Cotações reais",
    description:
      "Ações da B3, criptomoedas e câmbio com preços atualizados. Se uma fonte falha, o preço estimado aparece sinalizado.",
  },
  {
    icon: Compass,
    title: "Seu perfil de investidor",
    description:
      "Em 7 perguntas, descubra se você é conservador, moderado ou arrojado e receba recomendações.",
  },
  {
    icon: Shield,
    title: "Risco explicado",
    description:
      "Volatilidade, maior queda e concentração da carteira, calculadas sobre o seu histórico e sem jargão.",
  },
];

const STEPS = [
  {
    title: "Crie sua conta",
    description: "Nome, e-mail e senha. Leva um minuto e não pede cartão.",
  },
  {
    title: "Adicione saldo grátis",
    description:
      "Escolha quanto quer para treinar, até R$ 3 milhões no total. Dá para adicionar mais depois.",
  },
  {
    title: "Descubra seu perfil",
    description: "Responda 7 perguntas e veja a carteira de referência para o seu perfil.",
  },
  {
    title: "Invista e acompanhe",
    description:
      "Compre ações e cripto, guarde na caixinha e acompanhe rendimento e risco no Painel.",
  },
];

const RESOURCES: Feature[] = [
  {
    icon: BookOpen,
    title: "Ordens",
    description: "Compra e venda a mercado, limitada ou stop. Cripto também por valor em reais.",
  },
  {
    icon: PiggyBank,
    title: "Caixinha",
    description: "Guarde e resgate quando quiser, rendendo 100% do CDI.",
  },
  {
    icon: DollarSign,
    title: "Câmbio",
    description: "Converta reais em dólar e outras moedas com a cotação do dia.",
  },
  {
    icon: ChartPie,
    title: "Diversificação",
    description: "Veja quanto da carteira está em cada tipo de investimento.",
  },
  {
    icon: Lightbulb,
    title: "Recomendações",
    description: "Sugestões com base no seu perfil e no que já está na carteira.",
  },
  {
    icon: Newspaper,
    title: "Notícias",
    description: "As principais notícias do mercado, separadas por assunto.",
  },
];

const SAFETY_CHECKS = [
  "Sem cartão de crédito",
  "Sem dados bancários",
  "Operações 100% simuladas",
  "Nada é cobrado",
];

// Um estilo só para os títulos de seção, do celular ao computador.
const SECTION_TITLE = "text-3xl font-bold leading-tight tracking-tight text-balance sm:text-4xl";
const SECTION = "scroll-mt-4 py-16 sm:py-24";
const BODY_TEXT = "text-base leading-relaxed text-muted-foreground sm:text-[1.0625rem]";
const CARD_TEXT = "text-[0.9375rem] leading-relaxed text-muted-foreground";

function CheckItem({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      <Check size={16} strokeWidth={2.5} className="shrink-0 text-primary" aria-hidden="true" />
      {children}
    </li>
  );
}

function FeatureIcon({ icon: Icon, className }: { icon: LucideIcon; className?: string }) {
  return (
    <span className={cn("flex items-center justify-center rounded-xl text-primary", className)}>
      <Icon size={20} aria-hidden="true" />
    </span>
  );
}

// Página inicial para quem ainda não entrou: apresenta o simulador e leva ao cadastro. As faixas
// usam os tokens do tema; "O diferencial" é escura nos dois temas (data-theme="dark" local, ver
// index.css), como no design aprovado.
export function Landing() {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-primary-solid focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground"
      >
        Pular para o conteúdo
      </a>

      <LandingHeader />

      <main id="conteudo" className="flex-1">
        <section id="topo" className="scroll-mt-4 bg-landing-glow py-12 sm:py-24">
          <div className={cn(LANDING_CONTAINER, "grid grid-cols-1 items-center gap-10 nav:grid-cols-2 nav:gap-12")}>
            <div className="flex flex-col gap-6">
              <span
                className={cn(
                  LANDING_EYEBROW,
                  "inline-flex items-center gap-2 self-start rounded-full bg-primary/10 px-3 py-1.5 text-primary",
                )}
              >
                <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
                Simulador de investimentos
              </span>
              <h1 className="text-4xl font-bold leading-[1.05] tracking-tight text-balance sm:text-5xl nav:text-6xl">
                Aprenda a investir sem arriscar o seu dinheiro.
              </h1>
              <p className="max-w-[30em] text-base leading-relaxed text-muted-foreground sm:text-lg">
                Adicione saldo simulado de graça, quando quiser, e monte uma carteira com ações da B3,
                criptomoedas e renda fixa usando cotações reais. Teste, erre e ajuste antes de colocar
                dinheiro de verdade.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button asChild size="lg" className="min-h-14 px-7">
                  <Link to="/register">Criar conta grátis</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="min-h-14 bg-surface-1 px-6">
                  <Link to="/login">Já tenho conta · Entrar</Link>
                </Button>
              </div>
              <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-muted-foreground">
                {HERO_CHECKS.map((item) => (
                  <CheckItem key={item}>{item}</CheckItem>
                ))}
              </ul>
            </div>
            <HeroPreview />
          </div>
        </section>

        <section
          aria-label="O problema e a proposta"
          className="border-y border-border bg-surface-1 py-16 sm:py-24"
        >
          <div className={cn(LANDING_CONTAINER, "grid grid-cols-1 gap-12 md:grid-cols-2 md:gap-16")}>
            <div className="flex flex-col gap-4">
              <p className={cn(LANDING_EYEBROW, "text-destructive")}>O problema</p>
              <h2 className={SECTION_TITLE}>Começar a investir dá medo, e errar custa caro.</h2>
              <p className={BODY_TEXT}>
                Termos que ninguém explica, a dúvida entre ação, cripto e renda fixa e o receio de perder o
                que levou meses para juntar. Muita gente adia a primeira aplicação por anos.
              </p>
            </div>
            <div className="flex flex-col gap-4">
              <p className={cn(LANDING_EYEBROW, "text-primary")}>A proposta do InvestPro</p>
              <h2 className={SECTION_TITLE}>Pratique primeiro, com dinheiro de treino.</h2>
              <p className={BODY_TEXT}>
                O saldo é simulado e grátis: você adiciona quanto quiser, compra e vende com os preços reais
                do dia e vê o resultado na hora. Rendimento, risco e diversificação explicados em português
                claro.
              </p>
            </div>
          </div>
        </section>

        <section
          data-theme="dark"
          aria-labelledby="diferencial-titulo"
          className="bg-background bg-landing-grid py-16 text-foreground sm:py-24"
        >
          <div className={LANDING_CONTAINER}>
            <div className="grid grid-cols-1 gap-4 nav:grid-cols-12 nav:items-end nav:gap-6">
              <div className="flex flex-col gap-4 nav:col-span-7">
                <p className={cn(LANDING_EYEBROW, "text-primary")}>O diferencial</p>
                <h2
                  id="diferencial-titulo"
                  className="text-3xl font-bold leading-tight tracking-tight text-balance sm:text-[2.75rem]"
                >
                  Um simulador que ensina enquanto você investe.
                </h2>
              </div>
              <p className="text-base leading-relaxed text-muted-foreground nav:col-span-4 nav:col-start-9">
                Tudo acontece com dinheiro simulado. Nada do que você fizer aqui mexe na sua conta de
                verdade.
              </p>
            </div>
            <ul className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 nav:mt-12 nav:grid-cols-4 nav:gap-6">
              {DIFFERENTIALS.map((item) => (
                <li
                  key={item.title}
                  className="flex flex-col gap-3 rounded-2xl border border-border-strong bg-surface-1/40 p-6 nav:p-7"
                >
                  <FeatureIcon
                    icon={item.icon}
                    className="mb-2 size-11 border border-primary/25 bg-primary/12"
                  />
                  <h3 className="text-lg font-bold leading-snug">{item.title}</h3>
                  <p className={CARD_TEXT}>{item.description}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="como-funciona" aria-labelledby="como-funciona-titulo" className={SECTION}>
          <div className={LANDING_CONTAINER}>
            <div className="flex max-w-3xl flex-col gap-4">
              <p className={cn(LANDING_EYEBROW, "text-primary")}>Como funciona</p>
              <h2 id="como-funciona-titulo" className={SECTION_TITLE}>
                Da conta criada à primeira carteira em poucos minutos.
              </h2>
            </div>
            <ol className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 nav:mt-12 nav:grid-cols-4 nav:gap-6">
              {STEPS.map((step, index) => (
                <li key={step.title} className={cn(cardClassName, "flex flex-col gap-2.5 nav:p-7")}>
                  <span className="mb-2.5 flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-full bg-primary-solid font-mono text-[0.9375rem] font-semibold text-primary-foreground">
                      {index + 1}
                    </span>
                    {index < STEPS.length - 1 && (
                      <span aria-hidden="true" className="hidden h-px flex-1 bg-primary/20 nav:block" />
                    )}
                  </span>
                  <h3 className="text-lg font-bold leading-snug">{step.title}</h3>
                  <p className={CARD_TEXT}>{step.description}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section
          id="recursos"
          aria-labelledby="recursos-titulo"
          className={cn(SECTION, "border-y border-border bg-surface-1")}
        >
          <div className={LANDING_CONTAINER}>
            <div className="flex flex-col gap-4">
              <p className={cn(LANDING_EYEBROW, "text-primary")}>Tudo num lugar</p>
              <h2 id="recursos-titulo" className={SECTION_TITLE}>
                O que você encontra lá dentro
              </h2>
            </div>
            <ul className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 nav:mt-12 nav:grid-cols-3 nav:gap-6">
              {RESOURCES.map((item) => (
                <li
                  key={item.title}
                  className="flex flex-col gap-2 rounded-2xl border border-border bg-background p-6"
                >
                  <FeatureIcon icon={item.icon} className="mb-2 size-10 bg-primary/10" />
                  <h3 className="text-lg font-bold">{item.title}</h3>
                  <p className={CARD_TEXT}>{item.description}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="transparencia" aria-labelledby="transparencia-titulo" className={SECTION}>
          <div className={cn(LANDING_CONTAINER, "grid grid-cols-1 gap-6 nav:grid-cols-12")}>
            <div className="flex flex-col gap-4 nav:col-span-5">
              <p className={cn(LANDING_EYEBROW, "text-warning")}>Transparência</p>
              <h2 id="transparencia-titulo" className={SECTION_TITLE}>
                É seguro? Nenhum dinheiro real sai da sua conta.
              </h2>
            </div>
            <div className="flex flex-col gap-6 nav:col-span-6 nav:col-start-7 nav:pt-10">
              <p className={BODY_TEXT}>
                O InvestPro é um projeto de portfólio: todas as operações são simuladas e nada é cobrado, nem
                o saldo que você adiciona. Use uma senha própria para o site, diferente das que você usa em
                outros serviços.
              </p>
              <ul className="grid grid-cols-1 gap-x-6 gap-y-3 text-[0.9375rem] font-medium sm:grid-cols-2">
                {SAFETY_CHECKS.map((item) => (
                  <CheckItem key={item}>{item}</CheckItem>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <div className={cn(LANDING_CONTAINER, "pb-16 sm:pb-24")}>
          <section
            id="criar-conta"
            aria-labelledby="criar-conta-titulo"
            className="grid grid-cols-1 items-center gap-8 rounded-3xl bg-primary-solid bg-landing-cta px-6 py-12 text-primary-foreground sm:p-12 nav:grid-cols-10 nav:gap-6 nav:p-18"
          >
            <div className="flex flex-col gap-4 nav:col-span-6">
              <h2
                id="criar-conta-titulo"
                className="text-3xl font-bold leading-[1.06] tracking-tight text-balance sm:text-5xl"
              >
                Sua primeira carteira está a um cadastro de distância.
              </h2>
              <p className="text-base leading-relaxed text-primary-foreground sm:text-lg">
                Crie a conta, adicione saldo simulado grátis e faça sua primeira compra hoje.
              </p>
            </div>
            <div className="flex flex-col gap-3 nav:col-span-3 nav:col-start-8">
              {/* Sobre o verde: botão branco com texto no verde escuro e contorno branco (>= 4,5:1). */}
              <Button
                asChild
                size="lg"
                className="min-h-14 bg-white text-primary-solid hover:bg-white/90 focus-visible:ring-white focus-visible:ring-offset-primary-solid"
              >
                <Link to="/register">Criar conta grátis</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="min-h-12 border-white/60 bg-transparent text-base text-primary-foreground hover:bg-white/10 hover:text-primary-foreground focus-visible:ring-white focus-visible:ring-offset-primary-solid"
              >
                <Link to="/login">Já tenho conta · Entrar</Link>
              </Button>
              <p className="text-center text-[0.8125rem] text-primary-foreground">
                Sem cartão · Leva um minuto
              </p>
            </div>
          </section>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
