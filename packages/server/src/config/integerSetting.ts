// Leitura de variáveis de ambiente inteiras com faixa rígida: valor fora da faixa
// ou não numérico derruba a inicialização (config errada e silenciosa numa janela
// de segurança/cotação é pior que um deploy que falha alto).

export interface IntegerSetting {
  name: string
  defaultValue: number
  min: number
  max: number
  unit: string
}

export function parseIntegerInRange(raw: string | undefined, setting: IntegerSetting): number {
  const text = raw?.trim()
  if (!text) return setting.defaultValue

  const value = Number(text)
  if (!Number.isInteger(value) || value < setting.min || value > setting.max) {
    throw new Error(
      `${setting.name} deve ser um inteiro entre ${setting.min} e ${setting.max} (${setting.unit}), recebido: "${text}"`
    )
  }
  return value
}
