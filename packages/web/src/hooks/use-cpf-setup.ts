import { useState } from "react";
import { toast } from "sonner";
import { useUpdateProfile } from "@/hooks/use-profile";
import { formatCpf, isValidCpf, normalizeCpf } from "@/lib/cpf";
import { ApiError } from "@/services/api";

type CpfFormField = "cpf" | "currentPassword";

interface CpfFormError {
  message: string;
  field: CpfFormField;
}

const INVALID_CPF: CpfFormError = { message: "CPF inválido. Confira os números.", field: "cpf" };
const PASSWORD_REQUIRED: CpfFormError = { message: "Informe sua senha atual para confirmar.", field: "currentPassword" };

// 403 INVALID_CURRENT_PASSWORD não é 401: a sessão continua valendo, só a confirmação falhou.
// 409 CPF_IN_USE é genérico de propósito: não revela se o CPF pertence a outra conta.
function serverError(error: Error): CpfFormError {
  if (error instanceof ApiError) {
    if (error.code === "INVALID_CURRENT_PASSWORD") return { message: "Senha atual incorreta.", field: "currentPassword" };
    if (error.code === "CPF_ALREADY_SET") return { message: "Seu CPF já foi cadastrado e não pode ser alterado.", field: "cpf" };
    if (error.code === "CPF_IN_USE") return { message: "Não foi possível usar este CPF.", field: "cpf" };
    if (error.status === 429) {
      const wait = error.retryAfterSeconds ? ` Tente novamente em ${error.retryAfterSeconds} s.` : " Aguarde alguns instantes e tente novamente.";
      return { message: `Muitas tentativas.${wait}`, field: "currentPassword" };
    }
    if (error.status === 400) return INVALID_CPF;
  }
  return { message: error.message, field: "cpf" };
}

interface UseCpfSetupOptions {
  // CPF que o perfil já tem (null = ainda não cadastrou).
  savedCpf: string | null;
  // O servidor disse que o CPF já existia: o perfil precisa ser relido para virar somente leitura.
  onAlreadySet: () => void;
}

/**
 * Cadastro do CPF (uma vez só): digitação com máscara, confirmação pela senha atual, validação no
 * cliente e erros do servidor. A senha vive só neste estado: nunca é logada nem guardada, e é
 * limpa assim que o servidor responde.
 */
export function useCpfSetup({ savedCpf, onAlreadySet }: UseCpfSetupOptions) {
  const [typedDigits, setTypedDigits] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [registeredCpf, setRegisteredCpf] = useState<string | null>(null);
  const [formError, setFormError] = useState<CpfFormError | null>(null);

  const update = useUpdateProfile({
    onSuccess: (profile) => {
      setCurrentPassword("");
      setRegisteredCpf(profile.cpf ?? typedDigits);
      toast.success("CPF cadastrado com sucesso!");
    },
    onError: (error) => {
      setCurrentPassword("");
      if (error instanceof ApiError && error.code === "CPF_ALREADY_SET") onAlreadySet();
      setFormError(serverError(error));
    },
  });

  const changeCpf = (raw: string) => {
    setTypedDigits(normalizeCpf(raw));
    setFormError(null);
  };

  const changeCurrentPassword = (value: string) => {
    setCurrentPassword(value);
    setFormError(null);
  };

  const saveCpf = async () => {
    if (!isValidCpf(typedDigits)) {
      setFormError(INVALID_CPF);
      return;
    }
    if (!currentPassword) {
      setFormError(PASSWORD_REQUIRED);
      return;
    }
    try {
      await update.mutate({ cpf: typedDigits, currentPassword });
    } catch {
      // erro já tratado via onError
    }
  };

  return {
    cpf: registeredCpf ?? savedCpf,
    typedCpf: formatCpf(typedDigits),
    currentPassword,
    error: formError,
    isSaving: update.isPending,
    changeCpf,
    changeCurrentPassword,
    saveCpf,
  };
}
