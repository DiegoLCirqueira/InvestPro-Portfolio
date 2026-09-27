import { useState } from "react";
import { ChevronLeft, RotateCcw } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  useInvestorProfile,
  useInvestorQuestionnaire,
  useSaveInvestorProfile,
} from "@/hooks/use-investor-profile";
import { useSubmitOnce } from "@/hooks/use-submit-once";
import { userMessageFor } from "@/lib/financial-error";
import { ALLOCATION_LABELS } from "@/lib/allocation";
import { AllocationBars } from "@/components/investor-profile/AllocationBars";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader } from "@/components/PageHeader";
import { SectionTitle } from "@/components/SectionTitle";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  InvestorProfile as SavedProfile,
  InvestorProfileAnswers,
  InvestorProfileDefinition,
  InvestorQuestion,
} from "@/types/investor-profile";

const BUTTON_BASE =
  "min-h-11 inline-flex items-center justify-center gap-2 px-5 rounded-xl text-sm font-bold transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50";
const PRIMARY_BUTTON = `${BUTTON_BASE} bg-primary-solid text-primary-foreground hover:opacity-90`;
const SECONDARY_BUTTON = `${BUTTON_BASE} border border-border bg-surface-2 text-foreground hover:bg-surface-3`;

// Questionário de perfil de investidor: uma pergunta por vez e, no fim, o
// perfil calculado pelo servidor com a carteira de referência.
export function InvestorProfile() {
  const navigate = useNavigate();
  const questionnaire = useInvestorQuestionnaire();
  const saved = useInvestorProfile();
  const [isRetaking, setIsRetaking] = useState(false);

  const isLoading = questionnaire.isLoading || saved.isLoading;
  const error = questionnaire.error ?? saved.error;
  const profile = saved.data?.profile ?? null;

  let body;
  if (isLoading) {
    body = <QuestionnaireSkeleton />;
  } else if (error || !questionnaire.data) {
    body = (
      <ErrorState
        message="Não foi possível carregar o questionário."
        onRetry={() => {
          void questionnaire.refetch();
          void saved.refetch();
        }}
      />
    );
  } else if (profile && !isRetaking) {
    const definition = questionnaire.data.profiles.find((item) => item.type === profile.type);
    body = definition && (
      <ProfileResult profile={profile} definition={definition} onRetake={() => setIsRetaking(true)} />
    );
  } else {
    body = (
      <Questionnaire
        questions={questionnaire.data.questions}
        onDone={async () => {
          setIsRetaking(false);
          await saved.refetch();
        }}
      />
    );
  }

  return (
    <div className="flex flex-col animate-in fade-in duration-500">
      <div className="flex-1 flex nav:items-start nav:justify-center">
        <div className="w-full flex flex-col nav:max-w-2xl nav:rounded-2xl nav:border nav:border-border nav:bg-surface-1 nav:p-8 nav:shadow-2xl">
          <button
            type="button"
            onClick={() => navigate("/profile")}
            className="flex items-center gap-1 min-h-11 -ml-2 px-2 mb-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors self-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronLeft size={20} />
            Perfil do usuário
          </button>

          <PageHeader title="Perfil de investidor" />

          {body}

          <p className="mt-8 text-xs text-muted-foreground">
            Questionário simplificado, para demonstração. Não substitui a análise de perfil
            (suitability) de uma instituição financeira nem é uma recomendação de investimento.
          </p>
        </div>
      </div>
    </div>
  );
}

function QuestionnaireSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-2 w-full rounded-full" />
      <Skeleton className="h-7 w-3/4" />
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full rounded-xl" />
      ))}
    </div>
  );
}

interface QuestionnaireProps {
  questions: InvestorQuestion[];
  onDone: () => Promise<void>;
}

function Questionnaire({ questions, onDone }: QuestionnaireProps) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<InvestorProfileAnswers>({});
  const save = useSaveInvestorProfile({
    onSuccess: () => {
      toast.success("Perfil de investidor atualizado!");
      void onDone();
    },
    onError: (error) => toast.error(userMessageFor(error)),
  });

  const question = questions[step];
  const selected = answers[question.id];
  const isLast = step === questions.length - 1;

  const next = async () => {
    if (!selected) return;
    if (!isLast) {
      setStep((current) => current + 1);
      return;
    }
    try {
      await save.mutate(answers);
    } catch {
      // erro já tratado via onError
    }
  };
  const handleSubmit = useSubmitOnce(next);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground">
          Pergunta {step + 1} de {questions.length}
        </p>
        <div
          role="progressbar"
          aria-label="Progresso do questionário"
          aria-valuemin={0}
          aria-valuemax={questions.length}
          aria-valuenow={step + 1}
          className="h-2 rounded-full bg-surface-3"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300"
            style={{ width: `${((step + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      <fieldset key={question.id} className="space-y-3">
        <legend className="mb-4 text-lg font-bold text-foreground">{question.title}</legend>
        {question.options.map((option) => {
          const isChecked = selected === option.id;
          return (
            <label
              key={option.id}
              className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-colors has-focus-visible:ring-2 has-focus-visible:ring-ring ${
                isChecked
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-surface-2 text-foreground hover:border-primary/50"
              }`}
            >
              <input
                type="radio"
                name={question.id}
                value={option.id}
                checked={isChecked}
                onChange={() => setAnswers((current) => ({ ...current, [question.id]: option.id }))}
                className="h-4 w-4 shrink-0 accent-(--color-primary)"
              />
              {option.label}
            </label>
          );
        })}
      </fieldset>

      <div className="flex gap-3">
        {step > 0 && (
          <button type="button" onClick={() => setStep((current) => current - 1)} className={SECONDARY_BUTTON}>
            Voltar
          </button>
        )}
        <button type="submit" disabled={!selected || save.isPending} className={`${PRIMARY_BUTTON} flex-1`}>
          {isLast ? (save.isPending ? "Calculando..." : "Ver meu perfil") : "Próxima"}
        </button>
      </div>
    </form>
  );
}

interface ProfileResultProps {
  profile: SavedProfile;
  definition: InvestorProfileDefinition;
  onRetake: () => void;
}

function ProfileResult({ profile, definition, onRetake }: ProfileResultProps) {
  const answeredAt = new Date(profile.answeredAt).toLocaleDateString("pt-BR");
  const rows = ALLOCATION_LABELS.map(({ type, label }) => ({
    type,
    label,
    targetPct: definition.targetAllocation[type],
  }));

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-primary/30 bg-primary/10 p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Seu perfil</p>
        <p className="mt-1 text-3xl font-bold text-foreground">{definition.label}</p>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{definition.description}</p>
        <p className="mt-3 text-xs text-muted-foreground">Respondido em {answeredAt}</p>
      </section>

      <section className="space-y-4">
        <SectionTitle>Carteira de referência</SectionTitle>
        <AllocationBars rows={rows} />
      </section>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link to="/recommendations" className={`${PRIMARY_BUTTON} flex-1`}>
          Ver recomendações para mim
        </Link>
        <button type="button" onClick={onRetake} className={SECONDARY_BUTTON}>
          <RotateCcw size={16} aria-hidden="true" />
          Refazer questionário
        </button>
      </div>
    </div>
  );
}
