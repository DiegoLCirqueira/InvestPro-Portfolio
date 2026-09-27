import { describe, expect, it } from 'vitest'
import { updateUserBodySchema } from '../user.schema.js'

describe('updateUserBodySchema — CPF definido pelo perfil', () => {
  it('aceita corpo vazio (todas as atualizações opcionais)', () => {
    expect(updateUserBodySchema.safeParse({}).success).toBe(true)
  })

  it('aceita CPF com ou sem máscara e entrega normalizado (11 dígitos)', () => {
    const currentPassword = 'SenhaForte123'
    expect(updateUserBodySchema.parse({ cpf: '529.982.247-25', currentPassword }).cpf).toBe('52998224725')
    expect(updateUserBodySchema.parse({ cpf: '52998224725', currentPassword }).cpf).toBe('52998224725')
  })

  it('CPF sem currentPassword (ausente ou vazio) é rejeitado; nome/telefone não exigem senha', () => {
    expect(updateUserBodySchema.safeParse({ cpf: '52998224725' }).success).toBe(false)
    expect(updateUserBodySchema.safeParse({ cpf: '52998224725', currentPassword: '' }).success).toBe(false)
    expect(updateUserBodySchema.safeParse({ fullName: 'Nome Válido', phone: '11999998888' }).success).toBe(true)
  })

  it.each([
    ['dígitos verificadores errados', '529.982.247-24'],
    ['sequência repetida', '111.111.111-11'],
    ['formato inválido', '5299822472'],
    ['texto', 'abc'],
  ])('rejeita CPF com %s', (_case, cpf) => {
    expect(updateUserBodySchema.safeParse({ cpf, currentPassword: 'SenhaForte123' }).success).toBe(false)
  })
})

describe('updateUserBodySchema — nome', () => {
  it('rejeita nome só com espaços', () => {
    expect(updateUserBodySchema.safeParse({ fullName: '   ' }).success).toBe(false)
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