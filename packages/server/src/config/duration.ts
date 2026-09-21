// Variáveis de ambiente em segundos (faixa rígida, ver integerSetting.ts).

import { parseIntegerInRange } from './integerSetting.js'

export interface SecondsSetting {
  name: string
  defaultSeconds: number
  minSeconds: number
  maxSeconds: number
}

export function parseSecondsInRange(raw: string | undefined, setting: SecondsSetting): number {
  return parseIntegerInRange(raw, {
    name: setting.name,
    defaultValue: setting.defaultSeconds,
    min: setting.minSeconds,
    max: setting.maxSeconds,
    unit: 'segundos',
  })
}
