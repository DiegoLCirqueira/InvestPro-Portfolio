import type { usePixKeyInput } from "@/hooks/use-pix-key-input";
import { PIX_KEY_TYPE_LABELS } from "@/lib/pix-key";

const INPUT_ID = "pix-key";

// Campo único de chave PIX: mostra o tipo reconhecido e, se os dígitos servem
// pra CPF e celular, pergunta qual dos dois (como nos apps de banco).
export function PixKeyField({ input }: { input: ReturnType<typeof usePixKeyInput> }) {
  const { displayValue, onChange, pixKey, ambiguousTypes, chooseType } = input;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={INPUT_ID} className="text-sm text-muted-foreground">
        Chave PIX
      </label>
      <input
        id={INPUT_ID}
        type="text"
        autoComplete="off"
        value={displayValue}
        onChange={onChange}
        placeholder="CPF, CNPJ, celular, e-mail ou chave aleatória"
        className="w-full px-4 py-3 rounded-xl bg-surface-2 border border-input text-foreground placeholder-muted-foreground text-base focus:outline-none focus:border-brand-primary transition-colors duration-200 tabular-nums"
      />

      <div aria-live="polite" className="min-h-5 text-xs text-muted-foreground">
        {pixKey ? (
          <span>
            Chave identificada: <strong className="text-foreground">{PIX_KEY_TYPE_LABELS[pixKey.type]}</strong>
          </span>
        ) : null}

        {ambiguousTypes.length > 0 ? (
          <div role="group" aria-label="Tipo da chave PIX" className="flex flex-wrap items-center gap-2">
            <span>Essa chave é um:</span>
            {ambiguousTypes.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => chooseType(type)}
                className="min-h-11 px-4 rounded-lg border border-input bg-surface-2 text-foreground font-bold hover:border-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {PIX_KEY_TYPE_LABELS[type]}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
