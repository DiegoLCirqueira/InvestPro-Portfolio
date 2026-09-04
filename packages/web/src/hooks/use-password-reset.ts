import { api } from "@/services/api";
import { useMutation } from "@/hooks/use-mutation";

export interface ForgotPasswordInput {
  email: string;
}

export function useForgotPassword(): ReturnType<
  typeof useMutation<unknown, ForgotPasswordInput>
> {
  return useMutation<unknown, ForgotPasswordInput>({
    action: (input) => api.post("/auth/forgot-password", input),
  });
}

export interface ResetPasswordInput {
  token: string;
  password: string;
}

export function useResetPassword(): ReturnType<
  typeof useMutation<unknown, ResetPasswordInput>
> {
  return useMutation<unknown, ResetPasswordInput>({
    action: (input) => api.post("/auth/reset-password", input),
  });
}
