// @investpro/server
// Testes de INTEGRAÇÃO de PATCH /api/v1/users/me definindo o CPF (uma vez) contra
// o PostgreSQL real, incluindo corrida entre PATCH simultâneos e o destravamento
// da transferência (que exige CPF).

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { prisma } from '../../../config/database.js'
import {
  deleteUser,
  fundPortfolio,
  registerTestUser,
  startApp,
  stopApp,
  uniqueEmail,
  uniqueIp,
  uniqueValidCpf,
} from '../../../test/integration.helpers.js'

// Cada teste registra usuários contra o Postgres remoto: acima dos 5s padrão.
const SLOW_DB_TEST = { timeout: 30000 }

let app: FastifyInstance | undefined
const emails: string[] = []

interface TestUser {
  id: string
  email: string
  token: string
}

async function createUser(prefix: string): Promise<TestUser> {
  const email = uniqueEmail(prefix)
  emails.push(email)
  const reg = await registerTestUser(app!, email)
  return { id: reg.body.user.id as string, email, token: reg.body.accessToken as string }
}

// Senha usada por registerTestUser; definir o CPF exige reconfirmá-la (currentPassword).
const TEST_USER_PASSWORD = 'SenhaForte123'

function patchProfileRaw(user: TestUser, payload: Record<string, unknown>) {
  return app!.inject({
    method: 'PATCH',
    url: '/api/v1/users/me',
    headers: { authorization: `Bearer ${user.token}` },
    remoteAddress: uniqueIp(),
    payload,
  })
}

// Como o frontend: quando o corpo tem cpf, envia a senha atual junto.
function patchProfile(user: TestUser, payload: Record<string, unknown>) {
  const withPassword = 'cpf' in payload ? { currentPassword: TEST_USER_PASSWORD, ...payload } : payload
  return patchProfileRaw(user, withPassword)
}

async function storedCpfOf(user: TestUser): Promise<string | null> {
  const row = await prisma.user.findUnique({ where: { id: user.id }, select: { cpf: true } })
  return row?.cpf ?? null
}

beforeAll(async () => {
  app = await startApp()
})

// Vários usuários contra o Postgres remoto: limpa em paralelo.
afterAll(async () => {
  await stopApp(app)
  await Promise.all(emails.map(deleteUser))
}, 60000)

describe('PATCH /api/v1/users/me — definir CPF', SLOW_DB_TEST, () => {
  it('define o CPF (com máscara), devolve o perfil com o CPF normalizado e persiste', async () => {
    const user = await createUser('cpf-set')
    const cpf = uniqueValidCpf()
    const masked = `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`

    const res = await patchProfile(user, { cpf: masked })

    expect(res.statusCode).toBe(200)
    expect(res.json().cpf).toBe(cpf)
    expect(await storedCpfOf(user)).toBe(cpf)
  })

  it('junto com nome e telefone: aplica tudo', async () => {
    const user = await createUser('cpf-set-all')
    const cpf = uniqueValidCpf()

    const res = await patchProfile(user, { fullName: 'Nome Novo', phone: '11999998888', cpf })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ fullName: 'Nome Novo', phone: '11999998888', cpf })
  })

  it('repetir (mesmo CPF ou outro) retorna 409 CPF_ALREADY_SET e não altera o CPF salvo', async () => {
    const user = await createUser('cpf-locked')
    const original = uniqueValidCpf()
    await patchProfile(user, { cpf: original })

    const same = await patchProfile(user, { cpf: original })
    const other = await patchProfile(user, { cpf: uniqueValidCpf() })

    for (const res of [same, other]) {
      expect(res.statusCode).toBe(409)
      expect(res.json().error).toBe('CPF_ALREADY_SET')
    }
    expect(await storedCpfOf(user)).toBe(original)
  })

  it('CPF já travado + nome no mesmo PATCH: 409 e o nome NÃO é alterado (transação)', async () => {
    const user = await createUser('cpf-atomic')
    await patchProfile(user, { cpf: uniqueValidCpf(), fullName: 'Nome Original' })

    const res = await patchProfile(user, { cpf: uniqueValidCpf(), fullName: 'Nome Trocado' })

    expect(res.statusCode).toBe(409)
    const row = await prisma.user.findUnique({ where: { id: user.id }, select: { fullName: true } })
    expect(row?.fullName).toBe('Nome Original')
  })

  it.each([
    ['dígitos verificadores errados', '529.982.247-24'],
    ['sequência repetida', '11111111111'],
    ['formato inválido', '123'],
  ])('CPF com %s retorna 400 VALIDATION_ERROR e não grava', async (_case, cpf) => {
    const user = await createUser('cpf-invalid')

    const res = await patchProfile(user, { cpf })

    expect(res.statusCode).toBe(400)
    expect(res.json().error).toBe('VALIDATION_ERROR')
    expect(await storedCpfOf(user)).toBeNull()
  })

  it('CPF de outra conta retorna 409 CPF_IN_USE com mensagem genérica, sem revelar o dono', async () => {
    const owner = await createUser('cpf-owner')
    const other = await createUser('cpf-other')
    const cpf = uniqueValidCpf()
    await patchProfile(owner, { cpf })

    const res = await patchProfile(other, { cpf })

    expect(res.statusCode).toBe(409)
    expect(res.json().error).toBe('CPF_IN_USE')
    const responseText = res.body.toLowerCase()
    expect(responseText).not.toContain(cpf)
    expect(responseText).not.toContain(owner.email.toLowerCase())
    expect(await storedCpfOf(other)).toBeNull()
  })
})

describe('PATCH /api/v1/users/me — senha atual para definir o CPF', SLOW_DB_TEST, () => {
  it('senha atual errada: 403 INVALID_CURRENT_PASSWORD (não 401) e o CPF NÃO é gravado', async () => {
    const user = await createUser('cpf-wrong-password')

    const res = await patchProfileRaw(user, { cpf: uniqueValidCpf(), currentPassword: 'SenhaErrada999' })

    expect(res.statusCode).toBe(403)
    expect(res.json().error).toBe('INVALID_CURRENT_PASSWORD')
    expect(await storedCpfOf(user)).toBeNull()
  })

  it('sem currentPassword: 400 VALIDATION_ERROR e o CPF NÃO é gravado', async () => {
    const user = await createUser('cpf-no-password')

    const res = await patchProfileRaw(user, { cpf: uniqueValidCpf() })

    expect(res.statusCode).toBe(400)
    expect(res.json().error).toBe('VALIDATION_ERROR')
    expect(await storedCpfOf(user)).toBeNull()
  })

  it('senha atual certa: define o CPF; a senha não aparece na resposta', async () => {
    const user = await createUser('cpf-right-password')
    const cpf = uniqueValidCpf()

    const res = await patchProfileRaw(user, { cpf, currentPassword: TEST_USER_PASSWORD })

    expect(res.statusCode).toBe(200)
    expect(res.json().cpf).toBe(cpf)
    expect(res.body).not.toContain(TEST_USER_PASSWORD)
  })

  it('CPF já definido + senha errada: 403 (a senha vem antes do estado do CPF)', async () => {
    const user = await createUser('cpf-locked-wrong-password')
    await patchProfile(user, { cpf: uniqueValidCpf() })

    const res = await patchProfileRaw(user, { cpf: uniqueValidCpf(), currentPassword: 'SenhaErrada999' })

    expect(res.statusCode).toBe(403)
    expect(res.json().error).toBe('INVALID_CURRENT_PASSWORD')
  })

  it('contador por conta: 10 senhas erradas bloqueiam (429 ACCOUNT_RATE_LIMITED), inclusive com a senha certa', async () => {
    const user = await createUser('cpf-password-counter')
    const wrong = () => patchProfileRaw(user, { cpf: uniqueValidCpf(), currentPassword: 'SenhaErrada999' })

    const statuses: number[] = []
    for (let i = 0; i < 10; i++) statuses.push((await wrong()).statusCode)
    expect(statuses).toEqual(Array(10).fill(403))

    const blockedWrong = await wrong()
    expect(blockedWrong.statusCode).toBe(429)
    expect(blockedWrong.json().error).toBe('ACCOUNT_RATE_LIMITED')

    const blockedRight = await patchProfile(user, { cpf: uniqueValidCpf() })
    expect(blockedRight.statusCode).toBe(429)
    expect(await storedCpfOf(user)).toBeNull()
  })

  it('nome e telefone continuam sem exigir senha (e não gastam o contador)', async () => {
    const user = await createUser('cpf-name-phone-no-password')

    const res = await patchProfileRaw(user, { fullName: 'Sem Senha Necessaria', phone: '11999998888' })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ fullName: 'Sem Senha Necessaria', phone: '11999998888' })
  })
})

describe('PATCH /api/v1/users/me — concorrência', SLOW_DB_TEST, () => {
  it('dois PATCH simultâneos da mesma conta com CPFs diferentes: um vence (200), o outro 409 CPF_ALREADY_SET', async () => {
    const user = await createUser('cpf-race-same-user')
    const [cpfA, cpfB] = [uniqueValidCpf(), uniqueValidCpf()]

    const [resA, resB] = await Promise.all([
      patchProfile(user, { cpf: cpfA }),
      patchProfile(user, { cpf: cpfB }),
    ])

    expect([resA.statusCode, resB.statusCode].sort()).toEqual([200, 409])
    const loser = resA.statusCode === 409 ? resA : resB
    expect(loser.json().error).toBe('CPF_ALREADY_SET')

    const winnerCpf = resA.statusCode === 200 ? cpfA : cpfB
    expect(await storedCpfOf(user)).toBe(winnerCpf)
  })

  it('duas contas tentando o MESMO CPF ao mesmo tempo: uma fica com ele (200), a outra 409 CPF_IN_USE', async () => {
    const first = await createUser('cpf-race-a')
    const second = await createUser('cpf-race-b')
    const cpf = uniqueValidCpf()

    const [resFirst, resSecond] = await Promise.all([
      patchProfile(first, { cpf }),
      patchProfile(second, { cpf }),
    ])

    expect([resFirst.statusCode, resSecond.statusCode].sort()).toEqual([200, 409])
    const loser = resFirst.statusCode === 409 ? resFirst : resSecond
    expect(loser.json().error).toBe('CPF_IN_USE')

    const holders = [await storedCpfOf(first), await storedCpfOf(second)].filter((v) => v === cpf)
    expect(holders).toHaveLength(1)
  })
})

describe('transferência depende do CPF do perfil', SLOW_DB_TEST, () => {
  it('sem CPF a transferência dá 400 CPF_REQUIRED; depois de definir o CPF no perfil, deixa de dar', async () => {
    const user = await createUser('cpf-transfer')
    await fundPortfolio(user.id, 500)
    const transfer = () =>
      app!.inject({
        method: 'POST',
        url: '/api/v1/transfers',
        headers: { authorization: `Bearer ${user.token}` },
        remoteAddress: uniqueIp(),
        payload: { type: 'PIX', amount: 10, pixKey: 'qa-pix@investpro.com' },
      })

    const before = await transfer()
    expect(before.statusCode).toBe(400)
    expect(before.json().error).toBe('CPF_REQUIRED')

    expect((await patchProfile(user, { cpf: uniqueValidCpf() })).statusCode).toBe(200)

    const after = await transfer()
    expect(after.statusCode).toBe(200)
    expect(after.json().status).toBe('COMPLETED')
  })
})
