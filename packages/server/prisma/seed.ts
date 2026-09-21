import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/modules/auth/lib/password.js'
import { assertSeedAllowed, describeAccountPassword, resolveSeedPassword } from './seed-credentials.js'

const prisma = new PrismaClient()

const DEMO_EMAIL = 'diego@investpro.com'
const ADMIN_EMAIL = 'admin@investpro.com'
const DEMO_PASSWORD_ENV = 'SEED_USER_PASSWORD'
const ADMIN_PASSWORD_ENV = 'SEED_ADMIN_PASSWORD'

async function accountExists(email: string): Promise<boolean> {
  return (await prisma.user.findUnique({ where: { email }, select: { id: true } })) !== null
}

async function main() {
  // Antes de qualquer acesso ao banco: recusa produção sem autorização e valida
  // as senhas das envs (sem senha fixa no código: ver seed-credentials.ts).
  assertSeedAllowed()
  const demoPassword = resolveSeedPassword(DEMO_PASSWORD_ENV)
  const adminPassword = resolveSeedPassword(ADMIN_PASSWORD_ENV)

  console.log('Iniciando seed do banco de dados...')

  const demoExisted = await accountExists(DEMO_EMAIL)
  // A senha só vale pra conta NOVA: o update do upsert nunca inclui passwordHash.
  const passwordHash = await hashPassword(demoPassword.password)

  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {},
    create: {
      email: DEMO_EMAIL,
      passwordHash,
      fullName: 'Diego',
      phone: '(11) 99999-9999',
      role: 'USER',
    },
  })

  console.log('Usuário criado:', user.email)
  console.log(describeAccountPassword(DEMO_EMAIL, demoExisted, demoPassword, DEMO_PASSWORD_ENV))

  const adminExisted = await accountExists(ADMIN_EMAIL)
  const adminPasswordHash = await hashPassword(adminPassword.password)

  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { role: 'ADMIN' },
    create: {
      email: ADMIN_EMAIL,
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
  console.log(describeAccountPassword(ADMIN_EMAIL, adminExisted, adminPassword, ADMIN_PASSWORD_ENV))

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
