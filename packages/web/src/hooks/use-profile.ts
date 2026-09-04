import { api } from "@/services/api";
import { useQuery } from "@/hooks/use-query";
import { useMutation } from "@/hooks/use-mutation";
import type { UserRole } from "@/types/user";

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  cpf: string | null;
  role: UserRole;
  createdAt: string;
}

export interface UpdateProfileInput {
  fullName?: string;
  phone?: string;
}

export interface UseProfileOptions {
  initialData?: UserProfile;
  enabled?: boolean;
}

export function useProfile({ initialData, enabled = true }: UseProfileOptions = {}) {
  return useQuery<UserProfile>({
    fetcher: () => api.get<UserProfile>("/users/me"),
    deps: [],
    initialData,
    enabled,
  });
}

export interface UseUpdateProfileOptions {
  onSuccess?: (profile: UserProfile) => void;
  onError?: (error: Error) => void;
}

export function useUpdateProfile(
  options: UseUpdateProfileOptions = {},
): ReturnType<typeof useMutation<UserProfile, UpdateProfileInput>> {
  return useMutation<UserProfile, UpdateProfileInput>({
    action: (input) => api.patch<UserProfile>("/users/me", input),
    onSuccess: options.onSuccess,
    onError: options.onError,
  });
}
