// @investpro/server
// Testes do auth.service (register/login/refresh/logout) com prisma mockado.
// Objetivo: provar que a LÓGICA de autenticação está correta SEM depender de
// PostgreSQL. Com o DB indisponível, as rotas retornam 500 (a causa é infra,
// não código) — ver WI-229. Estes testes validam o fluxo quando o DB responde.

import { describe, expect, it, beforeEach, vi } from 'vitest'

vi.mock('../../../config/env.js', () => ({
  env: {
    NODE_ENV: 'development',
    JWT_SECRET: 'test-secret',
    JWT_REFRESH_SECRET: 'test-refresh-secret',
    FRONTEND_URL: 'http://localhost:5173',
    RESEND_API_KEY: 'test-resend-key',
    RESEND_FROM_EMAIL: 'InvestPro <test@investpro.app>',
  },
}))

const mocks = vi.hoisted(() => {
  return {
    findUnique: vi.fn(),
    create: vi.fn(),
    transaction: vi.fn(),
    refreshTokenFindUnique: vi.fn(),
    refreshTokenUpdate: vi.fn(),
    refreshTokenCreate: vi.fn(),
    refreshTokenUpdateMany: vi.fn(),
    refreshTokenDeleteMany: vi.fn(),
    userCreate: vi.fn(),
    userUpdate: vi.fn(),
    portfolioCreate: vi.fn(),
    passwordResetTokenDeleteMany: vi.fn(),
    passwordResetTokenCreate: vi.fn(),
    passwordResetTokenUpdateMany: vi.fn(),
    passwordResetTokenFindUniqueOrThrow: vi.fn(),
    sendPasswordResetEmail: vi.fn(),
    sendPasswordChangedEmail: vi.fn(),
    isEmailRateLimited: vi.fn(),
  }
})

vi.mock('../../../config/database.js', () => ({
  prisma: {
    user: {
      findUnique: mocks.findUnique,
      create: mocks.userCreate,
      update: mocks.userUpdate,
    },
    portfolio: {
      create: mocks.portfolioCreate,
    },
    refreshToken: {
      findUnique: mocks.refreshTokenFindUnique,
      update: mocks.refreshTokenUpdate,
      create: mocks.refreshTokenCreate,
      updateMany: mocks.refreshTokenUpdateMany,
      deleteMany: mocks.refreshTokenDeleteMany,
    },
    passwordResetToken: {
      deleteMany: mocks.passwordResetTokenDeleteMany,
      create: mocks.passwordResetTokenCreate,
      updateMany: mocks.passwordResetTokenUpdateMany,
      findUniqueOrThrow: mocks.passwordResetTokenFindUniqueOrThrow,
    },
    $transaction: mocks.transaction,
  },
}))

vi.mock('../lib/email.js', () => ({
  sendPasswordResetEmail: mocks.sendPasswordResetEmail,
  sendPasswordChangedEmail: mocks.sendPasswordChangedEmail,
}))

vi.mock('../lib/emailRateLimit.js', () => ({
  isEmailRateLimited: mocks.isEmailRateLimited,
}))

import bcrypt from 'bcryptjs'
import type { FastifyBaseLogger } from 'fastify'
import { register, login, refresh, logout, forgotPassword, resetPassword, AppError } from '../auth.service.js'

const fakeLog = { error: vi.fn() } as unknown as FastifyBaseLogger

const BASE = {
  email: 'diego@investpro.com',
  password: '123456',
  fullName: 'Diego',
}

const dbUser = {
  id: 'user-1',
  email: BASE.email,
  fullName: BASE.fullName,
  cpf: null,
  passwordHash: '$2b$12$abcdefghijklmnopqrstuv', // valor irrelevante (mock)
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.refreshTokenFindUnique.mockResolvedValue(null)
  mocks.isEmailRateLimited.mockReturnValue(false)
  mocks.sendPasswordResetEmail.mockResolvedValue(undefined)
  mocks.sendPasswordChangedEmail.mockResolvedValue(undefined)
})

describe('register', () => {
  it('cria usuário, portfólio e refresh token em transação, e devolve tokens', async () => {
    mocks.findUnique.mockResolvedValue(null) // email livre
    mocks.transaction.mockImplementation(async (fn: unknown) => {
      return await (fn as (tx: unknown) => Promise<unknown>)(
        {
          user: { create: mocks.userCreate },
          portfolio: { create: mocks.portfolioCreate },
        }
      )
    })
    mocks.userCreate.mockResolvedValue(dbUser)
    mocks.portfolioCreate.mockResolvedValue({ id: 'pf-1' })
    mocks.refreshTokenCreate.mockResolvedValue({ id: 'rt-1' })

    const result = await register({ email: BASE.email, password: BASE.password, fullName: BASE.fullName })

    expect(mocks.findUnique).toHaveBeenCalledWith({ where: { email: BASE.email } })
    expect(mocks.transaction).toHaveBeenCalled()
    expect(mocks.refreshTokenCreate).toHaveBeenCalled()
    expect(result).toMatchObject({
      user: { id: 'user-1', email: BASE.email, fullName: BASE.fullName },
    })
    expect(result.accessToken).toBeTruthy()
    expect(result.refreshToken).toBeTruthy()
    expect(result.user).not.toHaveProperty('passwordHash')
  })

  it('lança EMAIL_TAKEN quando o email já existe', async () => {
    mocks.findUnique.mockResolvedValue(dbUser)
    await expect(
      register({ email: BASE.email, password: BASE.password, fullName: BASE.fullName })
    ).rejects.toMatchObject<AppError>({ code: 'EMAIL_TAKEN', statusCode: 409 })
  })

  it('armazena a senha com hash bcrypt', async () => {
    mocks.findUnique.mockResolvedValue(null)
    mocks.transaction.mockImplementation(async (fn: unknown) => {
      return await (fn as (tx: unknown) => Promise<unknown>)(
        { user: { create: mocks.userCreate }, portfolio: { create: mocks.portfolioCreate } }
      )
    })
    mocks.userCreate.mockImplementation(async (args: { data: { passwordHash: string } }) => {
      return { ...dbUser, passwordHash: args.data.passwordHash }
    })
    mocks.refreshTokenCreate.mockResolvedValue({ id: 'rt-1' })

    await register({ email: BASE.email, password: BASE.password, fullName: BASE.fullName })

    const createCall = mocks.userCreate.mock.calls[0][0].data
    expect(createCall.passwordHash).not.toBe(BASE.password)
    expect(await bcrypt.compare(BASE.password, createCall.passwordHash)).toBe(true)
  })

  it('grava o refresh token com hash (nunca texto puro), rememberMe: false e um familyId (WI-27)', async () => {
    mocks.findUnique.mockResolvedValue(null)
    mocks.transaction.mockImplementation(async (fn: unknown) => {
      return await (fn as (tx: unknown) => Promise<unknown>)(
        { user: { create: mocks.userCreate }, portfolio: { create: mocks.portfolioCreate } }
      )
    })
    mocks.userCreate.mockResolvedValue(dbUser)
    mocks.portfolioCreate.mockResolvedValue({ id: 'pf-1' })
    mocks.refreshTokenCreate.mockResolvedValue({ id: 'rt-1' })

    const result = await register({ email: BASE.email, password: BASE.password, fullName: BASE.fullName })

    const createArgs = mocks.refreshTokenCreate.mock.calls[0][0].data
    expect(createArgs).not.toHaveProperty('token')
    expect(createArgs.tokenHash).toMatch(/^[a-f0-9]{64}$/)
    expect(createArgs.tokenHash).not.toBe(result.refreshToken)
    expect(createArgs.rememberMe).toBe(false)
    expect(createArgs.familyId).toBeTruthy()
    expect(result.rememberMe).toBe(false)
  })
})

describe('login', () => {
  it('valida credenciais corretas e devolve usuário sem passwordHash', async () => {
    const hash = await bcrypt.hash(BASE.password, 4)
    mocks.findUnique.mockResolvedValue({ ...dbUser, passwordHash: hash })

    const result = await login({ email: BASE.email, password: BASE.password })

    expect(mocks.refreshTokenCreate).toHaveBeenCalled()
    expect(result.user).toMatchObject({ id: 'user-1', email: BASE.email })
    expect(result.accessToken).toBeTruthy()
  })

  it('lança INVALID_CREDENTIALS para email inexistente', async () => {
    mocks.findUnique.mockResolvedValue(null)
    await expect(login({ email: BASE.email, password: BASE.password })).rejects.toMatchObject<AppError>({
      code: 'INVALID_CREDENTIALS',
      statusCode: 401,
    })
  })

  it('lança INVALID_CREDENTIALS para senha errada', async () => {
    const hash = await bcrypt.hash('senha-certa', 4)
    mocks.findUnique.mockResolvedValue({ ...dbUser, passwordHash: hash })
    await expect(login({ email: BASE.email, password: 'senha-errada' })).rejects.toMatchObject<AppError>({
      code: 'INVALID_CREDENTIALS',
      statusCode: 401,
    })
  })

  it('rememberMe: true grava refresh token com TTL de ~30 dias; ausente/false grava ~7 dias (WI-27)', async () => {
    const hash = await bcrypt.hash(BASE.password, 4)
    mocks.findUnique.mockResolvedValue({ ...dbUser, passwordHash: hash })
    mocks.refreshTokenCreate.mockResolvedValue({ id: 'rt-1' })

    const remembered = await login({ email: BASE.email, password: BASE.password, rememberMe: true })
    const rememberedArgs = mocks.refreshTokenCreate.mock.calls[0][0].data
    expect(remembered.rememberMe).toBe(true)
    expect(rememberedArgs.rememberMe).toBe(true)
    expect(rememberedArgs.expiresAt.getTime() - Date.now()).toBeGreaterThan(29 * 24 * 60 * 60 * 1000)

    mocks.refreshTokenCreate.mockClear()
    const notRemembered = await login({ email: BASE.email, password: BASE.password, rememberMe: false })
    const notRememberedArgs = mocks.refreshTokenCreate.mock.calls[0][0].data
    expect(notRemembered.rememberMe).toBe(false)
    const ttlMs = notRememberedArgs.expiresAt.getTime() - Date.now()
    expect(ttlMs).toBeGreaterThan(6 * 24 * 60 * 60 * 1000)
    expect(ttlMs).toBeLessThanOrEqual(7 * 24 * 60 * 60 * 1000)
  })
})

function mockRefreshTx(): void {
  mocks.transaction.mockImplementation(async (fn: unknown) => {
    return await (fn as (tx: unknown) => Promise<unknown>)({
      refreshToken: { update: mocks.refreshTokenUpdate, create: mocks.refreshTokenCreate },
    })
  })
}

describe('refresh', () => {
  it('rotaciona tokens quando o refresh token é válido e persistido: revoga o antigo, cria um novo na mesma família', async () => {
    mockRefreshTx()
    mocks.refreshTokenFindUnique.mockResolvedValue({
      id: 'rt-1',
      userId: 'user-1',
      familyId: 'fam-1',
      rememberMe: false,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 86400000),
    })
    mocks.refreshTokenUpdate.mockResolvedValue({ id: 'rt-1' })
    mocks.refreshTokenCreate.mockResolvedValue({ id: 'rt-2' })

    const result = await refresh('token-valido')

    expect(mocks.refreshTokenUpdate).toHaveBeenCalledWith({
      where: { id: 'rt-1' },
      data: { revokedAt: expect.any(Date) },
    })
    expect(mocks.refreshTokenCreate).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        tokenHash: expect.any(String),
        familyId: 'fam-1',
        rememberMe: false,
        expiresAt: expect.any(Date),
      },
    })
    expect(result).toHaveProperty('accessToken')
    expect(result.refreshToken).not.toBe('token-valido') // token novo, não o mesmo
    expect(result.rememberMe).toBe(false)
  })

  it('lança INVALID_REFRESH_TOKEN quando o token não está persistido', async () => {
    mocks.refreshTokenFindUnique.mockResolvedValue(null)
    await expect(refresh('token-invalido')).rejects.toMatchObject<AppError>({
      code: 'INVALID_REFRESH_TOKEN',
      statusCode: 401,
    })
  })

  it('lança REFRESH_TOKEN_EXPIRED quando o token persistido expirou', async () => {
    mocks.refreshTokenFindUnique.mockResolvedValue({
      id: 'rt-x',
      userId: 'user-1',
      familyId: 'fam-1',
      rememberMe: false,
      revokedAt: null,
      expiresAt: new Date(Date.now() - 1000),
    })
    await expect(refresh('token-expirado')).rejects.toMatchObject<AppError>({
      code: 'REFRESH_TOKEN_EXPIRED',
      statusCode: 401,
    })
  })

  it('detecta reuso (token já revogado/rotacionado sendo reapresentado) e revoga TODOS os refresh tokens do usuário (WI-27)', async () => {
    mocks.refreshTokenFindUnique.mockResolvedValue({
      id: 'rt-old',
      userId: 'user-1',
      familyId: 'fam-1',
      rememberMe: false,
      revokedAt: new Date(Date.now() - 60_000),
      expiresAt: new Date(Date.now() + 86400000),
    })
    mocks.refreshTokenUpdateMany.mockResolvedValue({ count: 3 })

    await expect(refresh('token-ja-rotacionado')).rejects.toMatchObject<AppError>({
      code: 'REFRESH_TOKEN_REUSE_DETECTED',
      statusCode: 401,
    })
    expect(mocks.refreshTokenUpdateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    })
    expect(mocks.refreshTokenCreate).not.toHaveBeenCalled()
  })

  it('propaga rememberMe do token original pro token rotacionado (TTL de ~30 dias)', async () => {
    mockRefreshTx()
    mocks.refreshTokenFindUnique.mockResolvedValue({
      id: 'rt-1',
      userId: 'user-1',
      familyId: 'fam-1',
      rememberMe: true,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 86400000),
    })
    mocks.refreshTokenUpdate.mockResolvedValue({ id: 'rt-1' })
    mocks.refreshTokenCreate.mockResolvedValue({ id: 'rt-2' })

    const result = await refresh('token-lembrado')

    expect(result.rememberMe).toBe(true)
    const createArgs = mocks.refreshTokenCreate.mock.calls[0][0].data
    expect(createArgs.rememberMe).toBe(true)
    const ttlMs = createArgs.expiresAt.getTime() - Date.now()
    expect(ttlMs).toBeGreaterThan(29 * 24 * 60 * 60 * 1000)
  })
})

describe('logout', () => {
  it('apaga (não só revoga) o refresh token pelo hash — invalidação final e deliberada', async () => {
    mocks.refreshTokenDeleteMany.mockResolvedValue({ count: 1 })
    await expect(logout('t')).resolves.toBeUndefined()
    expect(mocks.refreshTokenDeleteMany).toHaveBeenCalledWith({
      where: { tokenHash: expect.any(String) },
    })
  })

  it('não lança erro quando o token não existe (deleteMany não encontra nada pra apagar)', async () => {
    mocks.refreshTokenDeleteMany.mockResolvedValue({ count: 0 })
    await expect(logout('desconhecido')).resolves.toBeUndefined()
  })
})

describe('forgotPassword', () => {
  it('invalida tokens anteriores e cria um novo token de reset quando o email existe', async () => {
    mocks.findUnique.mockResolvedValue(dbUser)
    mocks.passwordResetTokenDeleteMany.mockResolvedValue({ count: 1 })
    mocks.passwordResetTokenCreate.mockResolvedValue({ id: 'prt-1' })

    await forgotPassword(dbUser.email, fakeLog)

    expect(mocks.passwordResetTokenDeleteMany).toHaveBeenCalledWith({
      where: { userId: dbUser.id, usedAt: null },
    })
    expect(mocks.passwordResetTokenCreate).toHaveBeenCalledTimes(1)
    const createArgs = mocks.passwordResetTokenCreate.mock.calls[0][0].data
    expect(createArgs.userId).toBe(dbUser.id)
    expect(createArgs.tokenHash).toMatch(/^[a-f0-9]{64}$/) // hex sha256
    expect(createArgs.tokenHash).not.toContain(' ')
  })

  it('nunca persiste o token em texto puro (só o hash)', async () => {
    mocks.findUnique.mockResolvedValue(dbUser)
    mocks.passwordResetTokenDeleteMany.mockResolvedValue({ count: 0 })
    mocks.passwordResetTokenCreate.mockResolvedValue({ id: 'prt-1' })

    await forgotPassword(dbUser.email, fakeLog)

    const createArgs = mocks.passwordResetTokenCreate.mock.calls[0][0].data
    expect(createArgs).not.toHaveProperty('token')
    expect(Object.keys(createArgs).sort()).toEqual(['expiresAt', 'tokenHash', 'userId'].sort())
  })

  it('não cria token nem lança erro quando o email não existe', async () => {
    mocks.findUnique.mockResolvedValue(null)
    await expect(forgotPassword('nao-existe@teste.com', fakeLog)).resolves.toBeUndefined()
    expect(mocks.passwordResetTokenCreate).not.toHaveBeenCalled()
  })

  it('não faz nada quando o email está sob rate limit', async () => {
    mocks.isEmailRateLimited.mockReturnValue(true)
    await forgotPassword(dbUser.email, fakeLog)
    expect(mocks.findUnique).not.toHaveBeenCalled()
    expect(mocks.passwordResetTokenCreate).not.toHaveBeenCalled()
  })
})

describe('resetPassword', () => {
  function mockTransactionTx(): void {
    mocks.transaction.mockImplementation(async (fn: unknown) => {
      return await (fn as (tx: unknown) => Promise<unknown>)({
        passwordResetToken: {
          updateMany: mocks.passwordResetTokenUpdateMany,
          findUniqueOrThrow: mocks.passwordResetTokenFindUniqueOrThrow,
          deleteMany: mocks.passwordResetTokenDeleteMany,
        },
        user: { update: mocks.userUpdate },
        refreshToken: { deleteMany: mocks.refreshTokenDeleteMany },
      })
    })
  }

  it('redefine a senha, invalida refresh tokens e outros tokens de reset pendentes (fluxo feliz)', async () => {
    mockTransactionTx()
    mocks.passwordResetTokenUpdateMany.mockResolvedValue({ count: 1 })
    mocks.passwordResetTokenFindUniqueOrThrow.mockResolvedValue({ id: 'prt-1', userId: dbUser.id })
    mocks.userUpdate.mockResolvedValue(dbUser)
    mocks.refreshTokenDeleteMany.mockResolvedValue({ count: 2 })
    mocks.passwordResetTokenDeleteMany.mockResolvedValue({ count: 1 })

    await resetPassword('token-valido', 'NovaSenhaForte123', fakeLog)

    expect(mocks.passwordResetTokenUpdateMany).toHaveBeenCalledWith({
      where: { tokenHash: expect.any(String), usedAt: null, expiresAt: { gt: expect.any(Date) } },
      data: { usedAt: expect.any(Date) },
    })
    expect(mocks.userUpdate).toHaveBeenCalledWith({
      where: { id: dbUser.id },
      data: { passwordHash: expect.any(String) },
    })
    expect(mocks.refreshTokenDeleteMany).toHaveBeenCalledWith({ where: { userId: dbUser.id } })
    expect(mocks.passwordResetTokenDeleteMany).toHaveBeenCalledWith({
      where: { userId: dbUser.id, usedAt: null },
    })

    const newHash = mocks.userUpdate.mock.calls[0][0].data.passwordHash
    expect(await bcrypt.compare('NovaSenhaForte123', newHash)).toBe(true)
  })

  it('lança INVALID_RESET_TOKEN (genérico) quando o token não existe/expirou/já foi usado', async () => {
    mockTransactionTx()
    mocks.passwordResetTokenUpdateMany.mockResolvedValue({ count: 0 })

    await expect(resetPassword('token-invalido', 'NovaSenhaForte123', fakeLog)).rejects.toMatchObject<AppError>({
      code: 'INVALID_RESET_TOKEN',
      statusCode: 400,
    })
    expect(mocks.userUpdate).not.toHaveBeenCalled()
  })
})