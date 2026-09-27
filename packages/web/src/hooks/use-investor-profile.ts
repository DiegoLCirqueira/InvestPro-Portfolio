import { api } from "@/services/api";
import { useQuery } from "@/hooks/use-query";
import { useMutation } from "@/hooks/use-mutation";
import type {
  InvestorProfileAnswers,
  InvestorProfileResponse,
  InvestorProfileType,
  InvestorQuestionnaire,
  RecommendationsResponse,
} from "@/types/investor-profile";

const PROFILE_ENDPOINT = "/users/me/investor-profile";

// Mesmos rótulos do servidor (INVESTOR_PROFILE_INFO), para telas que só têm o
// tipo do perfil e não carregam o questionário inteiro.
export const INVESTOR_PROFILE_LABELS: Record<InvestorProfileType, string> = {
  CONSERVATIVE: "Conservador",
  MODERATE: "Moderado",
  AGGRESSIVE: "Arrojado",
};

export function useInvestorProfile() {
  return useQuery<InvestorProfileResponse>({
    fetcher: () => api.get<InvestorProfileResponse>(PROFILE_ENDPOINT),
    deps: [],
  });
}

export function useInvestorQuestionnaire() {
  return useQuery<InvestorQuestionnaire>({
    fetcher: () => api.get<InvestorQuestionnaire>(`${PROFILE_ENDPOINT}/questionnaire`),
    deps: [],
  });
}

export interface UseSaveInvestorProfileOptions {
  onSuccess?: (result: InvestorProfileResponse) => void;
  onError?: (error: Error) => void;
}

export function useSaveInvestorProfile(options: UseSaveInvestorProfileOptions = {}) {
  return useMutation<InvestorProfileResponse, InvestorProfileAnswers>({
    action: (answers) => api.put<InvestorProfileResponse>(PROFILE_ENDPOINT, { answers }),
    onSuccess: options.onSuccess,
    onError: options.onError,
  });
}

export function useRecommendations() {
  return useQuery<RecommendationsResponse>({
    fetcher: () => api.get<RecommendationsResponse>("/recommendations"),
    deps: [],
  });
}
