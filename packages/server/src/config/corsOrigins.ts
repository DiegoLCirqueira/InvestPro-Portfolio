// CORS_ORIGIN: uma ou mais origens do frontend, separadas por vírgula (ex.: durante
// a migração de domínio, a origem antiga e a nova ao mesmo tempo). Cada item é uma
// origem exata (esquema http/https + host [+ porta]); o navegador compara o header
// Origin com ela byte a byte, então barra final, caminho, porta padrão explícita,
// maiúsculas ou curinga nunca casariam e são recusados já no boot. As mensagens
// citam a posição do item na lista, não o valor.

const DEFAULT_ORIGIN = 'http://localhost:5173'

// Origem exata = o que o navegador manda em Origin (new URL().origin normaliza
// host em minúsculas, tira porta padrão, caminho e credenciais).
function isExactOrigin(value: string): boolean {
  try {
    const url = new URL(value)
    return (url.protocol === 'http:' || url.protocol === 'https:') && url.origin === value
  } catch {
    return false
  }
}

function splitOrigins(raw: string): string[] {
  const items = raw.split(',').map((item) => item.trim()).filter(Boolean)
  return [...new Set(items)]
}

function assertExactOrigin(origin: string, position: number): void {
  if (origin.includes('*')) {
    throw new Error(
      `CORS_ORIGIN: o item ${position} tem curinga ('*'). Com credentials: true use a origem exata (ex.: https://investpro.example.com).`
    )
  }
  if (!isExactOrigin(origin)) {
    throw new Error(
      `CORS_ORIGIN: o item ${position} não é uma origem exata. Use esquema + host [+ porta], sem barra final, caminho, credenciais nem porta padrão (ex.: https://investpro.example.com).`
    )
  }
}

// '*' sozinho fora de produção é o comportamento antigo de desenvolvimento; em
// qualquer outro caso (produção, ou misturado a outras origens) o item precisa ser exato.
function isLegacyDevWildcard(origins: string[], isProduction: boolean): boolean {
  return !isProduction && origins.length === 1 && origins[0] === '*'
}

export function parseCorsOrigins(raw: string | undefined, isProduction: boolean): string[] {
  const value = raw?.trim()
  if (!value) return validated([DEFAULT_ORIGIN], isProduction)

  const origins = splitOrigins(value)
  if (origins.length === 0) {
    throw new Error('CORS_ORIGIN: a lista está vazia. Informe ao menos uma origem exata.')
  }
  return validated(origins, isProduction)
}

function validated(origins: string[], isProduction: boolean): string[] {
  if (isProduction && origins.includes(DEFAULT_ORIGIN)) {
    throw new Error(
      'CORS_ORIGIN precisa ser definida explicitamente em produção; não use a origem padrão de desenvolvimento (localhost).'
    )
  }
  if (isLegacyDevWildcard(origins, isProduction)) return origins

  origins.forEach((origin, index) => assertExactOrigin(origin, index + 1))
  return origins
}
