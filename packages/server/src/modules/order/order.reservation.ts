// @investpro/server
// Reserva das ordens OPEN: uma LIMIT/STOP aberta ainda não moveu dinheiro nem
// posição, mas já os prometeu. Tudo que usa o saldo em conta (ordem, depósito
// na Caixinha, câmbio saindo de BRL, transferência) ou vende posição usa só o
// que está LIVRE, senão o mesmo dinheiro fica prometido duas vezes. Regra única
// aqui; cada módulo chama dentro da própria transação Serializable, então uma
// ordem criada ou cancelada ao mesmo tempo gera conflito e retry.

import type { Prisma } from '@prisma/client'
import { AppError } from '../auth/auth.service.js'
import { calculateOrderFee } from './order.domain.js'

type OrderReader = Pick<Prisma.TransactionClient, 'order'>

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

const formatBrl = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

// Custo debitado numa compra: valor da ordem + taxa de 1%, em centavos.
export function buyCost(total: number): number {
  return round2(total + calculateOrderFee(total))
}

// Soma do custo das BUY OPEN, no preço informado (limite/gatilho) + 1%.
export async function reservedBalance(client: OrderReader, userId: string): Promise<number> {
  const open = await client.order.findMany({
    where: { userId, status: 'OPEN', side: 'BUY' },
    select: { quantity: true, price: true },
  })
  const total = open.reduce(
    (sum, o) => sum + buyCost(round2(o.quantity.toNumber() * (o.price?.toNumber() ?? 0))),
    0
  )
  return round2(total)
}

// Soma das quantidades das SELL OPEN do ativo (somada em Decimal pelo banco).
export async function reservedQuantity(client: OrderReader, userId: string, ticker: string): Promise<number> {
  const { _sum } = await client.order.aggregate({
    where: { userId, status: 'OPEN', side: 'SELL', ticker },
    _sum: { quantity: true },
  })
  return _sum.quantity?.toNumber() ?? 0
}

export function reservedNote(reserved: number): string {
  return reserved > 0 ? ` (${formatBrl(reserved)} reservados em ordens abertas)` : ''
}

// Quanto falta no saldo livre (saldo − reservado) pra cobrir `amount`, em
// centavos; <= 0 quer dizer que cobre.
export async function freeBalanceShortfall(
  client: OrderReader,
  userId: string,
  balance: number,
  amount: number
): Promise<{ shortfall: number; reserved: number }> {
  const reserved = await reservedBalance(client, userId)
  return { shortfall: round2(amount + reserved - balance), reserved }
}

// Recusa com o código de saldo insuficiente do próprio módulo, citando a reserva.
export async function assertFreeBalance(
  client: OrderReader,
  userId: string,
  balance: number,
  amount: number,
  error: { code: string; message: string }
): Promise<void> {
  const { shortfall, reserved } = await freeBalanceShortfall(client, userId, balance, amount)
  if (shortfall > 0) throw new AppError(error.code, error.message + reservedNote(reserved), 400)
}
