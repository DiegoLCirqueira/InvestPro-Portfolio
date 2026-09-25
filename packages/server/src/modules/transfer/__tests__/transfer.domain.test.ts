import { describe, expect, it } from 'vitest'
import type { CreateTransferInput } from '@investpro/shared'
import {
  calculateTotal,
  determineStatus,
  formatToAccount,
  isTransferType,
  normalizedPixKey,
  transferFee,
  validateTransfer,
} from '../transfer.domain.js'

function baseInput(overrides: Partial<CreateTransferInput> = {}): CreateTransferInput {
  return {
    type: 'PIX',
    amount: 100,
    pixKey: 'destino@investpro.com',
    ...overrides,
  }
}

describe('transferFee', () => {
  it('PIX é gratuito; TED e DOC têm tarifa fixa', () => {
    expect(transferFee('PIX')).toBe(0)
    expect(transferFee('TED')).toBe(10)
    expect(transferFee('DOC')).toBe(5)
  })
})

describe('isTransferType', () => {
  it('valida tipos suportados', () => {
    expect(isTransferType('PIX')).toBe(true)
    expect(isTransferType('TED')).toBe(true)
    expect(isTransferType('DOC')).toBe(true)
    expect(isTransferType('BTC')).toBe(false)
  })
})

describe('validateTransfer', () => {
  it('válida transferência PIX simples', () => {
    expect(validateTransfer(baseInput())).toEqual([])
  })

  it('erro para valor não positivo', () => {
    expect(validateTransfer(baseInput({ amount: 0 }))).toContain(
      'Valor deve ser positivo'
    )
  })

  it('erro para conta de destino incompleta (agência vazia)', () => {
    const input = baseInput({
      toAccount: { id: 'x', bank: 'Banco X', agency: '', account: '123' },
    })
    const errors = validateTransfer(input)
    expect(errors.join(' ')).toContain('agency')
  })

  it('PIX sem número da conta é válida (só banco + agência)', () => {
    const input = baseInput({
      toAccount: { id: 'x', bank: 'Banco X', agency: '0001' },
    })
    expect(validateTransfer(input)).toEqual([])
  })

  it('PIX sem chave é inválida', () => {
    expect(validateTransfer(baseInput({ pixKey: undefined }))).toContain('Chave PIX obrigatória')
    expect(validateTransfer(baseInput({ pixKey: '  ' }))).toContain('Chave PIX obrigatória')
  })

  it('PIX com chave em formato inválido é inválida', () => {
    const errors = validateTransfer(baseInput({ pixKey: 'isso-nao-e-chave' }))
    expect(errors.join(' ')).toContain('Chave PIX inválida')
  })

  it('PIX com chave ambígua (CPF e celular) exige pixKeyType', () => {
    const ambiguous = baseInput({ pixKey: '82991234539' })
    expect(validateTransfer(ambiguous).join(' ')).toContain('Chave PIX ambígua')
    expect(validateTransfer({ ...ambiguous, pixKeyType: 'PHONE' })).toEqual([])
    expect(validateTransfer({ ...ambiguous, pixKeyType: 'CPF' })).toEqual([])
  })

  it('normalizedPixKey usa o tipo informado', () => {
    expect(normalizedPixKey(baseInput({ pixKey: '82 99123-4567' }))).toBe('+5582991234567')
    expect(normalizedPixKey(baseInput({ pixKey: '82991234539', pixKeyType: 'PHONE' }))).toBe('+5582991234539')
    expect(normalizedPixKey(baseInput({ pixKey: '529.982.247-25' }))).toBe('52998224725')
  })

  it('TED não exige chave PIX', () => {
    expect(validateTransfer(baseInput({ type: 'TED', pixKey: undefined }))).toEqual([])
  })

  it('TED sem número da conta é inválida', () => {
    const input = baseInput({
      type: 'TED',
      toAccount: { id: 'x', bank: 'Banco X', agency: '0001' },
    })
    const errors = validateTransfer(input)
    expect(errors.join(' ')).toContain('account')
  })
})

describe('formatToAccount', () => {
  it('mapeia a conta de destino no formato BankAccount', () => {
    const formatted = formatToAccount({
      id: 'x',
      bank: 'Banco',
      agency: '0001',
      account: '12345',
      holderName: 'João',
      type: 'PIX',
    })
    expect(formatted).toEqual({
      id: 'x',
      bank: 'Banco',
      agency: '0001',
      account: '12345',
      holderName: 'João',
      type: 'PIX',
    })
  })
})

describe('determineStatus', () => {
  it('sucesso e falha', () => {
    expect(determineStatus(true)).toBe('COMPLETED')
    expect(determineStatus(false)).toBe('FAILED')
  })
})

describe('calculateTotal', () => {
  it('soma tarifa ao valor', () => {
    expect(calculateTotal(100, 'PIX')).toBe(100)
    expect(calculateTotal(100, 'TED')).toBe(110)
  })
})