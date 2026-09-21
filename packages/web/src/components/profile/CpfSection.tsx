import { useEffect, useRef } from "react";
import { ProfileField } from "@/components/profile/ProfileField";
import { useCpfSetup } from "@/hooks/use-cpf-setup";
import { useSubmitOnce } from "@/hooks/use-submit-once";
import { formatCpf } from "@/lib/cpf";

interface CpfSectionProps {
  savedCpf: string | null;
  onAlreadySet: () => void;
  // Vindo do "Completar CPF" de Transferências: rola até o campo e foca nele.
  shouldFocus: boolean;
}

const HELP_ID = "profile-cpf-help";
const ERROR_ID = "profile-cpf-error";

export function CpfSection({ savedCpf, onAlreadySet, shouldFocus }: CpfSectionProps) {
  const cpfSetup = useCpfSetup({ savedCpf, onAlreadySet });
  const handleSubmit = useSubmitOnce(cpfSetup.saveCpf);
  const inputRef = useRef<HTMLInputElement>(null);
  const isEditable = cpfSetup.cpf === null;
  const error = cpfSetup.error;

  useEffect(() => {
    if (shouldFocus && isEditable) {
      inputRef.current?.scrollIntoView({ block: "center" });
      inputRef.current?.focus();
    }
  }, [shouldFocus, isEditable]);

  if (!isEditable) {
    return (
      <div className="space-y-2">
        <ProfileField label="CPF" id="profile-cpf" value={formatCpf(cpfSetup.cpf ?? "")} describedBy={HELP_ID} />
        <p id={HELP_ID} className="text-xs text-muted-foreground">
          CPF cadastrado; não pode ser alterado.
        </p>
      </div>
    );
  }

  const describedBy = error ? `${HELP_ID} ${ERROR_ID}` : HELP_ID;

  return (
    <form onSubmit={handleSubmit} className="space-y-2" noValidate>
      <div className="grid gap-4 nav:grid-cols-2">
        <ProfileField
          label="CPF"
          id="profile-cpf"
          inputRef={inputRef}
          editable
          inputMode="numeric"
          maxLength={14}
          placeholder="000.000.000-00"
          value={cpfSetup.typedCpf}
          onChange={cpfSetup.changeCpf}
          invalid={error?.field === "cpf"}
          describedBy={describedBy}
        />
        <ProfileField
          label="Senha atual"
          id="profile-cpf-password"
          type="password"
          autoComplete="current-password"
          editable
          value={cpfSetup.currentPassword}
          onChange={cpfSetup.changeCurrentPassword}
          invalid={error?.field === "currentPassword"}
          describedBy={describedBy}
        />
      </div>
      <p id={HELP_ID} className="text-xs text-muted-foreground">
        Necessário para transferências. Confirmamos com a sua senha e, depois de salvo, o CPF não poderá ser alterado.
      </p>
      {error && (
        <p id={ERROR_ID} role="alert" className="text-xs text-destructive">
          {error.message}
        </p>
      )}
      <button
        type="submit"
        disabled={cpfSetup.isSaving}
        className="min-h-11 w-full py-3 rounded-xl bg-primary-solid hover:opacity-90 disabled:opacity-50 transition-opacity duration-200 text-primary-foreground font-bold text-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {cpfSetup.isSaving ? "Salvando..." : "Salvar CPF"}
      </button>
    </form>
  );
}
