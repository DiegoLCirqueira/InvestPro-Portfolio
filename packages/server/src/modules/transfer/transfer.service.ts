// @investpro/server
// Service de transferências. Cria e lista transferências do usuário via
// prisma.transfer (fonte de verdade), no mesmo padrão de order.service.ts.

import type { Transfer as PrismaTransfer } from '@prisma/client'
import type {
  CreateTransferInput,
  Transfer,
  TransferList,
} from '@investpro/shared'
import { prisma } from '../../config/database.js'
import { AppError } from '../auth/auth.service.js'
import {
  determineStatus,
  formatToAccount,
  validateTransfer,
} from './transfer.domain.js'

function toTransfer(record: PrismaTransfer): Transfer {
  return {
    id: record.id,
    status: record.status as Transfer['status'],
    type: record.type as Transfer['type'],
    amount: record.amount.toNumber(),
    description: record.description,
    toAccount: record.toAccountId
      ? {
          id: record.toAccountId,
          bank: record.toAccountBank ?? '',
          agency: record.toAccountAgency ?? '',
          account: record.toAccountNumber ?? '',
          holderName: record.toAccountHolder ?? undefined,
          type: (record.toAccountType as Transfer['type'] | null) ?? undefined,
        }
      : undefined,
    createdAt: record.createdAt.toISOString(),
    completedAt: record.completedAt ? record.completedAt.toISOString() : null,
    failureReason: record.failureReason ?? undefined,
  }
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

  // formatToAccount roda uma única vez aqui: reaproveita o id da BankAccount
  // quando toAccount vem de uma conta existente, ou sintetiza um id novo
  // (fallback interno do domínio) quando é uma conta avulsa. O resultado é
  // persistido nas colunas toAccount*; listTransfers só lê essas colunas de
  // volta, sem chamar formatToAccount de novo (não recalcula a cada leitura).
  const toAccount = input.toAccount ? formatToAccount(input.toAccount) : undefined

  const created = await prisma.transfer.create({
    data: {
      userId,
      status,
      type: input.type,
      amount: input.amount,
      description: input.description ?? null,
      toAccountId: toAccount?.id ?? null,
      toAccountBank: toAccount?.bank ?? null,
      toAccountAgency: toAccount?.agency ?? null,
      toAccountNumber: toAccount?.account ?? null,
      toAccountHolder: toAccount?.holderName ?? null,
      toAccountType: toAccount?.type ?? null,
      completedAt: status === 'COMPLETED' ? new Date() : null,
      failureReason: status === 'FAILED' ? 'Execução externa falhou' : null,
    },
  })

  return toTransfer(created)
}

export async function listTransfers(
  userId: string,
  page: number,
  limit: number
): Promise<TransferList> {
  const skip = (page - 1) * limit
  const [records, total] = await Promise.all([
    prisma.transfer.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      skip,
      take: limit,
    }),
    prisma.transfer.count({ where: { userId } }),
  ])

  return {
    items: records.map(toTransfer),
    total,
    page,
    limit,
  }
}
