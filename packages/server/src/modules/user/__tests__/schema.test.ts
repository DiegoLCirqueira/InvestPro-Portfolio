import { describe, expect, it } from 'vitest'
import { updateUserBodySchema } from '../user.schema.js'

describe('updateUserBodySchema — CPF é somente leitura', () => {
  it('aceita corpo vazio (todas as atualizações opcionais)', () => {
    expect(updateUserBodySchema.safeParse({}).success).toBe(true)
  })

  it('rejeita qualquer tentativa de enviar cpf, mesmo com formato válido', () => {
    expect(updateUserBodySchema.safeParse({ cpf: '123.456.789-00' }).success).toBe(false)
    expect(updateUserBodySchema.safeParse({ cpf: '12345678900' }).success).toBe(false)
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