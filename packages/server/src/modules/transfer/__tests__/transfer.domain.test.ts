import { describe, expect, it } from 'vitest'
import type { CreateTransferInput } from '@investpro/shared'
import {
  calculateTotal,
  determineStatus,
  formatToAccount,
  isTransferType,
  transferFee,
  validateTransfer,
} from '../transfer.domain.js'

function baseInput(overrides: Partial<CreateTransferInput> = {}): CreateTransferInput {
  return {
    type: 'PIX',
    amount: 100,
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