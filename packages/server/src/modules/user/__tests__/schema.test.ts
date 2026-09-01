import { describe, expect, it } from 'vitest'
import { updateUserBodySchema } from '../user.schema.js'

describe('updateUserBodySchema — validação de CPF', () => {
  it('aceita CPF formatado (XXX.XXX.XXX-XX)', () => {
    expect(updateUserBodySchema.safeParse({ cpf: '123.456.789-00' }).success).toBe(true)
  })

  it('aceita CPF sem formatação (11 dígitos)', () => {
    expect(updateUserBodySchema.safeParse({ cpf: '12345678900' }).success).toBe(true)
  })

  it('aceita corpo vazio (todas as atualizações opcionais)', () => {
    expect(updateUserBodySchema.safeParse({}).success).toBe(true)
  })

  it('rejeita CPF com dígitos a mais', () => {
    expect(updateUserBodySchema.safeParse({ cpf: '123456789000' }).success).toBe(false)
  })

  it('rejeita CPF com dígitos a menos', () => {
    expect(updateUserBodySchema.safeParse({ cpf: '1234567890' }).success).toBe(false)
  })

  it('rejeita CPF com caracteres não numéricos', () => {
    expect(updateUserBodySchema.safeParse({ cpf: 'abc.def.ghi-jk' }).success).toBe(false)
    expect(updateUserBodySchema.safeParse({ cpf: '123.456.789-aa' }).success).toBe(false)
  })

  it('rejeita CPF com separadores no lugar errado', () => {
    expect(updateUserBodySchema.safeParse({ cpf: '111-222-333-44' }).success).toBe(false)
  })
})

describe('updateUserBodySchema — validação de telefone', () => {
  it('aceita telefone com e sem DDI', () => {
    expect(updateUserBodySchema.safeParse({ phone: '+5511999998888' }).success).toBe(true)
    expect(updateUserBodySchema.safeParse({ phone: '11999998888' }).success).toBe(true)
  })

  it('rejeita telefone inválido', () => {
    expect(updateUserBodySchema.safeParse({ phone: 'abc' }).success).toBe(false)
    expect(updateUserBodySchema.safeParse({ phone: '' }).success).toBe(false)
  })
})