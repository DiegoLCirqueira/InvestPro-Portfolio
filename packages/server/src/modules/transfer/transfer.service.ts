// @investpro/server
// Service de transferências. Cria e lista transferências do usuário via
// prisma.transfer (fonte de verdade), no mesmo padrão de order.service.ts.

import { Prisma } from '@prisma/client'
import type { Transfer as PrismaTransfer } from '@prisma/client'
import type {
  BankAccount,
  CreateTransferInput,
  Transfer,
  TransferList,
} from '@investpro/shared'
import { prisma } from '../../config/database.js'
import { AppError } from '../auth/auth.service.js'
import {
  calculateTotal,
  determineStatus,
  formatToAccount,
  validateTransfer,
  type TransferStatus,
} from './transfer.domain.js'

const MAX_TX_ATTEMPTS = 3

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

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

// Executa a criação da Transfer e, quando há saldo suficiente, o débito
// atômico de Portfolio.balance. Deve rodar dentro de uma transação Serializable.
// Saldo insuficiente lança ANTES de qualquer escrita — nada é persistido nesse
// caso (mesmo padrão de ORDER_INSUFFICIENT_POSITION em order.service.ts).
async function executeTransferTx(
  tx: Prisma.TransactionClient,
  userId: string,
  input: CreateTransferInput,
  status: TransferStatus,
  toAccount: BankAccount | undefined
): Promise<PrismaTransfer> {
  const portfolio = await tx.portfolio.findUnique({ where: { userId } })
  if (!portfolio) {
    throw new AppError('PORTFOLIO_NOT_FOUND', 'Portfólio não encontrado', 404)
  }

  const total = round2(calculateTotal(input.amount, input.type))
  if (portfolio.balance.toNumber() < total) {
    throw new AppError(
      'TRANSFER_INSUFFICIENT_BALANCE',
      'Saldo insuficiente para realizar a transferência',
      400
    )
  }

  await tx.portfolio.update({
    where: { id: portfolio.id },
    data: { balance: { decrement: total } },
  })

  return tx.transfer.create({
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
}

export async function createTransfer(
  userId: string,
  input: CreateTransferInput
): Promise<Transfer> {
  const errors = validateTransfer(input)
  if (errors.length > 0) {
    throw new AppError('TRANSFER_INVALID', errors.join('; '), 400)
  }

  // Decisão arquitetural R5: CPF é obrigatório para qualquer Transfer (PIX/TED/
  // DOC), exigência regulatória (BACEN). Checado ANTES de tocar em saldo/DB —
  // não afeta Order (compra/venda de ativos), só este módulo.
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { cpf: true } })
  if (!user?.cpf) {
    throw new AppError(
      'CPF_REQUIRED',
      'Complete seu CPF no perfil para realizar transferências',
      400
    )
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

  for (let attempt = 1; attempt <= MAX_TX_ATTEMPTS; attempt++) {
    try {
      const created = await prisma.$transaction(
        (tx) => executeTransferTx(tx, userId, input, status, toAccount),
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      )
      return toTransfer(created)
    } catch (err) {
      const isSerializationConflict =
        err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2034'
      if (isSerializationConflict && attempt < MAX_TX_ATTEMPTS) {
        continue
      }
      if (isSerializationConflict) {
        throw new AppError(
          'TRANSFER_EXECUTION_CONFLICT',
          'Conflito ao executar a transferência, tente novamente',
          409
        )
      }
      throw err
    }
  }

  // Inalcançável: o loop sempre retorna ou lança dentro das MAX_TX_ATTEMPTS iterações.
  throw new AppError(
    'TRANSFER_EXECUTION_CONFLICT',
    'Conflito ao executar a transferência, tente novamente',
    409
  )
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
