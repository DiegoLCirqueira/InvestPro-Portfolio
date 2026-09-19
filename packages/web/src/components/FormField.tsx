import type { ReactNode } from "react";

export const fieldInputClassName =
  "w-full px-4 py-3 rounded-xl bg-surface-2 border border-input text-foreground placeholder-muted-foreground text-base focus:outline-none focus:border-brand-primary transition-colors duration-200";

export const fieldButtonClassName = `${fieldInputClassName} flex items-center justify-between gap-2 text-left cursor-pointer`;

interface FormFieldProps {
  label: string;
  htmlFor?: string;
  children: ReactNode;
}

export function FormField({ label, htmlFor, children }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={htmlFor} className="text-sm text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}
