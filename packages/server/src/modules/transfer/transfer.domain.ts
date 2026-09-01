// @investpro/server
// Lógica pura de transferências bancárias (PIX/TED/DOC). Sem I/O/DB.
// Funções determinísticas e testáveis.

import type { BankAccount, CreateTransferInput } from '@investpro/shared'
import {
  TRANSFER_STATUSES,
  TRANSFER_TYPES,
} from '@investpro/shared'

export type TransferStatus = (typeof TRANSFER_STATUSES)[number]
export type TransferType = (typeof TRANSFER_TYPES)[number]

// Taxa fixa por modalidade (documentada):
//   PIX: R$ 0   (sem tarifa)
//   TED: R$ 10  (tarifa fixa)
//   DOC: R$ 5   (tarifa fixa)
export const TRANSFER_FEES: Record<TransferType, number> = {
  PIX: 0,
  TED: 10,
  DOC: 5,
}

export function isTransferType(value: string): value is TransferType {
  return (TRANSFER_TYPES as readonly string[]).includes(value)
}

export function transferFee(type: TransferType): number {
  return TRANSFER_FEES[type] ?? 0
}

export function validateTransfer(input: CreateTransferInput): string[] {
  const errors: string[] = []
  if (!isTransferType(input.type)) errors.push('Tipo de transferência inválido')
  if (!(input.amount > 0)) errors.push('Valor deve ser positivo')
  if (input.toAccount) {
    for (const field of ['bank', 'agency', 'account'] as const) {
      if (!input.toAccount[field] || input.toAccount[field].length === 0) {
        errors.push(`Conta de destino inválida: campo ${field} obrigatório`)
      }
    }
  }
  return errors
}

export function formatToAccount(account: BankAccount): BankAccount {
  return {
    id: account.id ?? `external-${Date.now()}`,
    bank: account.bank,
    agency: account.agency,
    account: account.account,
    holderName: account.holderName,
    type: account.type,
  }
}

export function determineStatus(success: boolean): TransferStatus {
  return success ? 'COMPLETED' : 'FAILED'
}

export function calculateTotal(amount: number, type: TransferType): number {
  return amount + transferFee(type)
}
