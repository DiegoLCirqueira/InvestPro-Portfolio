import { describe, expect, it } from 'vitest'
import {
  registerBodySchema,
  loginBodySchema,
  refreshBodySchema,
} from '../auth.schema.js'

const validRegistration = {
  email: 'ana@example.com',
  password: 'senha123',
  fullName: 'Ana Silva',
}

describe('registerBodySchema', () => {
  it('aceita um corpo válido sem CPF', () => {
    expect(registerBodySchema.safeParse(validRegistration).success).toBe(true)
  })

  it('aceita CPF formatado e sem formatação', () => {
    expect(registerBodySchema.safeParse({ ...validRegistration, cpf: '123.456.789-00' }).success).toBe(true)
    expect(registerBodySchema.safeParse({ ...validRegistration, cpf: '12345678900' }).success).toBe(true)
  })

  it('rejeita email inválido', () => {
    expect(registerBodySchema.safeParse({ ...validRegistration, email: 'nao-email' }).success).toBe(false)
  })

  it('rejeita senha curta (menos de 6 caracteres)', () => {
    expect(registerBodySchema.safeParse({ ...validRegistration, password: '12345' }).success).toBe(false)
  })

  it('rejeita nome curto (menos de 2 caracteres)', () => {
    expect(registerBodySchema.safeParse({ ...validRegistration, fullName: 'A' }).success).toBe(false)
  })

  it('rejeita CPF com formatos inválidos', () => {
    expect(registerBodySchema.safeParse({ ...validRegistration, cpf: '123.456.789-0' }).success).toBe(false)
    expect(registerBodySchema.safeParse({ ...validRegistration, cpf: '1234567890' }).success).toBe(false)
    expect(registerBodySchema.safeParse({ ...validRegistration, cpf: 'abc.def.ghi-jk' }).success).toBe(false)
  })

  it('rejeita corpo vazio', () => {
    expect(registerBodySchema.safeParse({}).success).toBe(false)
  })
})

describe('loginBodySchema', () => {
  it('aceita credenciais válidas', () => {
    expect(loginBodySchema.safeParse({ email: 'ana@example.com', password: 'senha123' }).success).toBe(true)
  })

  it('rejeita email inválido', () => {
    expect(loginBodySchema.safeParse({ email: 'x', password: 'senha123' }).success).toBe(false)
  })

  it('rejeita senha vazia', () => {
    expect(loginBodySchema.safeParse({ email: 'ana@example.com', password: '' }).success).toBe(false)
  })
})

describe('refreshBodySchema', () => {
  it('aceita corpo vazio (refresh usa cookie httpOnly)', () => {
    expect(refreshBodySchema.safeParse({}).success).toBe(true)
  })

  it('rejeita corpo não-objeto', () => {
    expect(refreshBodySchema.safeParse(undefined).success).toBe(false)
    expect(refreshBodySchema.safeParse(null).success).toBe(false)
    expect(refreshBodySchema.safeParse('token').success).toBe(false)
    expect(refreshBodySchema.safeParse(123).success).toBe(false)
  })
})