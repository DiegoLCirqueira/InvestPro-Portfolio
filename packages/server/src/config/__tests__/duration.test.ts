import { describe, expect, it } from 'vitest'
import { parseSecondsInRange } from '../duration.js'

const setting = { name: 'MINHA_VAR', defaultSeconds: 30, minSeconds: 0, maxSeconds: 300 }

describe('parseSecondsInRange', () => {
  it('sem valor (ou em branco) usa o padrão', () => {
    expect(parseSecondsInRange(undefined, setting)).toBe(30)
    expect(parseSecondsInRange('  ', setting)).toBe(30)
  })

  it('aceita inteiros dentro da faixa, inclusive os limites', () => {
    expect(parseSecondsInRange('45', setting)).toBe(45)
    expect(parseSecondsInRange('0', setting)).toBe(0)
    expect(parseSecondsInRange('300', setting)).toBe(300)
  })

  it.each(['301', '-1', '1.5', 'abc', '10s'])('valor %j fora da faixa/inválido derruba a inicialização', (raw) => {
    expect(() => parseSecondsInRange(raw, setting)).toThrow('MINHA_VAR')
  })
})
