import { describe, expect, it } from 'vitest'
import { isValidCnpj, parsePixKey } from '@investpro/shared'

describe('parsePixKey', () => {
  it.each([
    ['CPF sem máscara', '52998224725', { type: 'CPF', value: '52998224725' }],
    ['CPF com máscara', '529.982.247-25', { type: 'CPF', value: '52998224725' }],
    ['CNPJ com máscara', '11.222.333/0001-81', { type: 'CNPJ', value: '11222333000181' }],
    ['e-mail (normaliza caixa)', ' Fulano@Exemplo.com ', { type: 'EMAIL', value: 'fulano@exemplo.com' }],
    ['celular com +55', '+55 (11) 98765-4321', { type: 'PHONE', value: '+5511987654321' }],
    ['fixo com +55', '+551133334444', { type: 'PHONE', value: '+551133334444' }],
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
    ['CPF com dígito verificador errado', '52998224724'],
    ['CPF repetido', '111.111.111-11'],
    ['CNPJ com dígito verificador errado', '11222333000182'],
    ['e-mail sem domínio', 'fulano@'],
    ['e-mail acima de 77 caracteres', `${'a'.repeat(70)}@exemplo.com`],
    ['telefone de outro país', '+1 202 555 0100'],
    ['telefone curto', '+55 11 9876'],
    ['UUID incompleto', '123e4567-e89b-12d3-a456'],
  ])('recusa %s', (_label, raw) => {
    expect(parsePixKey(raw)).toBeNull()
  })
})

describe('isValidCnpj', () => {
  it('valida dígitos verificadores e recusa sequência repetida', () => {
    expect(isValidCnpj('11222333000181')).toBe(true)
    expect(isValidCnpj('11222333000180')).toBe(false)
    expect(isValidCnpj('00000000000000')).toBe(false)
  })
})
