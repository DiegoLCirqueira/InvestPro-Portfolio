import type { Ref } from "react";

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
}: ProfileFieldProps) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-semibold text-muted-foreground">
        {label}
      </label>
      <input
        id={id}
        ref={inputRef}
        value={value}
        placeholder={placeholder}
        type={type}
        autoComplete={autoComplete}
        inputMode={inputMode}
        maxLength={maxLength}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        onChange={editable && onChange ? (e) => onChange(e.target.value) : undefined}
        disabled={!editable}
        className={`w-full px-4 py-3 rounded-xl bg-surface-2 border text-foreground text-sm transition-colors duration-200 ${
          invalid ? "border-destructive" : "border-input"
        } ${
          editable
            ? "focus:outline-none focus:border-brand-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            : "focus:outline-none"
        }`}
      />
    </div>
  );
}
