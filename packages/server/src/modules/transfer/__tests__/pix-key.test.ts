import { describe, expect, it } from 'vitest'
import { isMobilePhone, isValidCnpj, parsePixKey, pixKeyCandidates } from '@investpro/shared'

// CPF válido cujos dígitos também formam um celular (DDD 82 + 9): chave ambígua.
const AMBIGUOUS_CPF_OR_PHONE = '82991234539'

describe('parsePixKey', () => {
  it.each([
    ['celular só com números', '82991234567', { type: 'PHONE', value: '+5582991234567' }],
    ['celular formatado', '82 99123-4567', { type: 'PHONE', value: '+5582991234567' }],
    ['celular com +55', '+55 (11) 98765-4321', { type: 'PHONE', value: '+5511987654321' }],
    ['CPF só com números', '52998224725', { type: 'CPF', value: '52998224725' }],
    ['CPF com máscara', '529.982.247-25', { type: 'CPF', value: '52998224725' }],
    ['CNPJ com máscara', '11.222.333/0001-81', { type: 'CNPJ', value: '11222333000181' }],
    ['e-mail (normaliza caixa)', ' Fulano@Exemplo.com ', { type: 'EMAIL', value: 'fulano@exemplo.com' }],
    [
      'chave aleatória',
      '123E4567-E89B-12D3-A456-426614174000',
      { type: 'EVP', value: '123e4567-e89b-12d3-a456-426614174000' },
    ],
  ])('aceita %s', (_label, raw, expected) => {
    expect(parsePixKey(raw)).toEqual(expected)
  })

  it.each([
    ['vazia', '   '],
    ['texto solto', 'isso-nao-e-chave'],
    ['CPF com dígito verificador errado e sem formato de celular', '13819183443'],
    ['CPF repetido', '111.111.111-11'],
    ['CNPJ com dígito verificador errado', '11222333000182'],
    ['e-mail sem domínio', 'fulano@'],
    ['e-mail acima de 77 caracteres', `${'a'.repeat(70)}@exemplo.com`],
    ['telefone de outro país', '+1 202 555 0100'],
    ['telefone fixo (PIX aceita só celular)', '+55 11 3333-4444'],
    ['celular com DDD inexistente', '20991234567'],
    ['UUID incompleto', '123e4567-e89b-12d3-a456'],
  ])('recusa %s', (_label, raw) => {
    expect(parsePixKey(raw)).toBeNull()
  })

  it('chave ambígua (CPF válido com formato de celular): sem tipo é recusada, com tipo resolve', () => {
    expect(pixKeyCandidates(AMBIGUOUS_CPF_OR_PHONE).map((key) => key.type)).toEqual(['CPF', 'PHONE'])
    expect(parsePixKey(AMBIGUOUS_CPF_OR_PHONE)).toBeNull()
    expect(parsePixKey(AMBIGUOUS_CPF_OR_PHONE, 'CPF')).toEqual({ type: 'CPF', value: AMBIGUOUS_CPF_OR_PHONE })
    expect(parsePixKey(AMBIGUOUS_CPF_OR_PHONE, 'PHONE')).toEqual({ type: 'PHONE', value: `+55${AMBIGUOUS_CPF_OR_PHONE}` })
  })

  it('tipo explícito que não corresponde à chave é recusado', () => {
    expect(parsePixKey('52998224725', 'PHONE')).toBeNull()
    expect(parsePixKey('82991234567', 'CPF')).toBeNull()
  })
})

describe('isMobilePhone', () => {
  it('exige DDD em uso, 9 na frente e 11 dígitos', () => {
    expect(isMobilePhone('82991234567')).toBe(true)
    expect(isMobilePhone('8291234567')).toBe(false)
    expect(isMobilePhone('82391234567')).toBe(false)
    expect(isMobilePhone('10991234567')).toBe(false)
  })
})

describe('isValidCnpj', () => {
  it('valida dígitos verificadores e recusa sequência repetida', () => {
    expect(isValidCnpj('11222333000181')).toBe(true)
    expect(isValidCnpj('11222333000180')).toBe(false)
    expect(isValidCnpj('00000000000000')).toBe(false)
  })
})
