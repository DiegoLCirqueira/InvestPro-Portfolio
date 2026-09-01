import { PrismaClient } from '@prisma/client'
import { hashSync } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Iniciando seed do banco de dados...')

  const passwordHash = hashSync('123456', 10)

  const user = await prisma.user.upsert({
    where: { email: 'diego@investpro.com' },
    update: {},
    create: {
      email: 'diego@investpro.com',
      passwordHash,
      fullName: 'Diego',
      phone: '(11) 99999-9999',
      role: 'USER',
    },
  })

  console.log('Usuário criado:', user.email)

  const adminPasswordHash = hashSync('admin123456', 10)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@investpro.com' },
    update: { role: 'ADMIN' },
    create: {
      email: 'admin@investpro.com',
      passwordHash: adminPasswordHash,
      fullName: 'Admin InvestPro',
      role: 'ADMIN',
    },
  })

  await prisma.portfolio.upsert({
    where: { userId: admin.id },
    update: {},
    create: {
      userId: admin.id,
      balance: 0,
    },
  })

  console.log('Usuário admin criado:', admin.email)

  const portfolio = await prisma.portfolio.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      balance: 175450.32,
    },
  })

  console.log('Portfolio criado com saldo: R$', portfolio.balance)

  const positions = [
    { ticker: 'BTC', name: 'Bitcoin', type: 'CRYPTO' as const, quantity: '0.00122611', avgPrice: '69573000.00', currentValue: 85400.00 },
    { ticker: 'ETH', name: 'Ethereum', type: 'CRYPTO' as const, quantity: '10.0', avgPrice: '2500.00', currentValue: 25000.00 },
    { ticker: 'VALE3', name: 'Vale ON', type: 'STOCK' as const, quantity: '760.0', avgPrice: '20.00', currentValue: 15200.50 },
    { ticker: 'ITUB4', name: 'Itaú Unibanco', type: 'STOCK' as const, quantity: '1000.0', avgPrice: '12.00', currentValue: 12000.00 },
    { ticker: 'SELIC', name: 'Tesouro Selic', type: 'FIXED_INCOME' as const, quantity: '37849.82', avgPrice: '1.00', currentValue: 37849.82 },
  ]

  for (const pos of positions) {
    await prisma.position.upsert({
      where: { portfolioId_ticker: { portfolioId: portfolio.id, ticker: pos.ticker } },
      update: {
        name: pos.name,
        type: pos.type,
        quantity: pos.quantity,
        avgPrice: pos.avgPrice,
        currentValue: pos.currentValue,
      },
      create: {
        portfolioId: portfolio.id,
        ticker: pos.ticker,
        name: pos.name,
        type: pos.type,
        quantity: pos.quantity,
        avgPrice: pos.avgPrice,
        currentValue: pos.currentValue,
      },
    })
  }

  console.log(`${positions.length} posições criadas`)
  console.log('Seed concluído com sucesso!')
}

main()
  .catch((e) => {
    console.error('Erro durante o seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
