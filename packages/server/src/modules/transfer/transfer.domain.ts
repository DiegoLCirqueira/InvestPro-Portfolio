// @investpro/server
// Lógica pura de transferências bancárias (PIX/TED/DOC). Sem I/O/DB.
// Funções determinísticas e testáveis.

import type { BankAccount, BankAccountInput, CreateTransferInput } from '@investpro/shared'
import {
  parsePixKey,
  pixKeyCandidates,
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

function pixKeyErrors({ pixKey, pixKeyType }: CreateTransferInput): string[] {
  if (!pixKey?.trim()) return ['Chave PIX obrigatória']
  if (!pixKeyType && pixKeyCandidates(pixKey).length > 1) {
    return ['Chave PIX ambígua: informe se é CPF ou celular (pixKeyType)']
  }
  if (!parsePixKey(pixKey, pixKeyType)) {
    return ['Chave PIX inválida: use CPF, CNPJ, e-mail, celular ou chave aleatória']
  }
  return []
}

export function validateTransfer(input: CreateTransferInput): string[] {
  const errors: string[] = []
  if (!isTransferType(input.type)) errors.push('Tipo de transferência inválido')
  if (!(input.amount > 0)) errors.push('Valor deve ser positivo')
  // PIX sem destino identificável debitaria o saldo sem entregar a ninguém.
  if (input.type === 'PIX') errors.push(...pixKeyErrors(input))
  if (input.toAccount) {
    // PIX identifica o destino pela chave (banco + agência); não exige número
    // da conta. TED/DOC continuam exigindo os três campos.
    const requiredFields =
      input.type === 'PIX' ? (['bank', 'agency'] as const) : (['bank', 'agency', 'account'] as const)
    for (const field of requiredFields) {
      if (!input.toAccount[field]) {
        errors.push(`Conta de destino inválida: campo ${field} obrigatório`)
      }
    }
  }
  return errors
}

/** Chave PIX na forma normalizada (só para PIX já validado); null nos demais tipos. */
export function normalizedPixKey(input: CreateTransferInput): string | null {
  if (input.type !== 'PIX' || !input.pixKey) return null
  return parsePixKey(input.pixKey, input.pixKeyType)?.value ?? null
}

export function formatToAccount(account: BankAccountInput): BankAccount {
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
