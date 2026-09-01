// @investpro/server
// Service de transferências. Cria e lista transferências do usuário.
//
// PERSISTÊNCIA / DB: os modelos `BankAccount` e `Transfer` foram adicionados ao
// `prisma/schema.prisma`, MAS o `npx prisma generate` está bloqueado neste
// ambiente (EPERM na query_engine-windows.dll.node, travada pelo servidor ativo
// em :3001) e o PostgreSQL :5432 está INDISPONÍVEL. Por isso o service mantém
// as transferências em memória por usuário (não sobrevivem a restart), em vez
// de invocar prisma.transfer (que o client atual ainda não reconhece).
// Quando o servidor for reiniciado + `prisma generate` + migração rodarem, o
// store pode ser trocado por prisma.$transaction. Se o banco estiver de pé num
// futuro, a criação deve gravar via prisma e tratar DB_UNAVAILABLE.

import type {
  CreateTransferInput,
  Transfer,
  TransferList,
} from '@investpro/shared'
import { AppError } from '../auth/auth.service.js'
import {
  determineStatus,
  formatToAccount,
  validateTransfer,
} from './transfer.domain.js'

const store = new Map<string, Transfer[]>()

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `transfer-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export async function createTransfer(
  userId: string,
  input: CreateTransferInput
): Promise<Transfer> {
  const errors = validateTransfer(input)
  if (errors.length > 0) {
    throw new AppError('TRANSFER_INVALID', errors.join('; '), 400)
  }

  // Simula a execução online da transferência (determinística: sucesso).
  const success = true
  const status = determineStatus(success)

  const transfer: Transfer = {
    id: generateId(),
    status,
    type: input.type,
    amount: input.amount,
    description: input.description ?? null,
    toAccount: input.toAccount ? formatToAccount(input.toAccount) : undefined,
    createdAt: new Date().toISOString(),
    completedAt: status === 'COMPLETED' ? new Date().toISOString() : null,
    failureReason: status === 'FAILED' ? 'Execução externa falhou' : undefined,
  }

  const userTransfers = store.get(userId) ?? []
  userTransfers.push(transfer)
  store.set(userId, userTransfers)

  return transfer
}

export async function listTransfers(
  userId: string,
  page: number,
  limit: number
): Promise<TransferList> {
  const userTransfers = store.get(userId) ?? []
  const start = (page - 1) * limit
  return {
    items: userTransfers.slice(start, start + limit),
    total: userTransfers.length,
    page,
    limit,
  }
}
