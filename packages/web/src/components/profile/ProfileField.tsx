import { useId, type Ref } from "react";

interface ProfileFieldProps {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  editable?: boolean;
  placeholder?: string;
  id?: string;
  inputRef?: Ref<HTMLInputElement>;
  inputMode?: "numeric" | "text";
  type?: "text" | "password";
  autoComplete?: string;
  maxLength?: number;
  invalid?: boolean;
  describedBy?: string;
  /** Mensagem de erro exibida abaixo do campo (também o marca como inválido). */
  error?: string;
}

export function ProfileField({
  label,
  value,
  onChange,
  editable = false,
  placeholder,
  id,
  inputRef,
  inputMode,
  type = "text",
  autoComplete,
  maxLength,
  invalid = false,
  describedBy,
  error,
}: ProfileFieldProps) {
  // Sem id o label não fica associado ao campo e o nome acessível vira o valor digitado.
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const isInvalid = invalid || Boolean(error);
  const describedByIds =
    [describedBy, error ? errorId : undefined].filter(Boolean).join(" ") ||
    undefined;

  return (
    <div className="space-y-2">
      <label
        htmlFor={inputId}
        className="block text-sm font-semibold text-muted-foreground"
      >
        {label}
      </label>
      <input
        id={inputId}
        ref={inputRef}
        value={value}
        placeholder={placeholder}
        type={type}
        autoComplete={autoComplete}
        inputMode={inputMode}
        maxLength={maxLength}
        aria-invalid={isInvalid}
        aria-describedby={describedByIds}
        onChange={
          editable && onChange ? (e) => onChange(e.target.value) : undefined
        }
        disabled={!editable}
        className={`w-full px-4 py-3 rounded-xl border text-sm transition-colors duration-200 ${
          isInvalid ? "border-destructive" : "border-input"
        } ${
          editable
            ? "bg-surface-2 text-foreground focus:outline-none focus:border-brand-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            : "bg-secondary text-muted-foreground cursor-not-allowed focus:outline-none"
        }`}
      />
      {error && (
        <p id={errorId} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
