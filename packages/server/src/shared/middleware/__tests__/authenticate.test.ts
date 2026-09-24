import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FastifyReply, FastifyRequest } from 'fastify'
import jwt from 'jsonwebtoken'
import { env } from '../../../config/env.js'
import { authenticate } from '../authenticate.js'

const findUnique = vi.hoisted(() => vi.fn())
vi.mock('../../../config/database.js', () => ({ prisma: { user: { findUnique } } }))

const USER = { id: 'user-1', email: 'qa@test.com', fullName: 'QA', role: 'USER' }

function fakeReply() {
  const reply = { status: vi.fn(), send: vi.fn() }
  reply.status.mockReturnValue(reply)
  reply.send.mockReturnValue(reply)
  return reply
}

function fakeRequest(authorization?: string) {
  return {
    headers: authorization ? { authorization } : {},
    log: { error: vi.fn() },
  } as unknown as FastifyRequest & { user?: unknown }
}

async function run(authorization?: string) {
  const request = fakeRequest(authorization)
  const reply = fakeReply()
  await authenticate(request, reply as unknown as FastifyReply)
  return { request, reply }
}

const validToken = () => `Bearer ${jwt.sign({ sub: USER.id }, env.JWT_SECRET as string, { expiresIn: '15m' })}`

describe('authenticate', () => {
  beforeEach(() => {
    findUnique.mockReset()
  })

  it('token válido e usuário existente: segue com request.user preenchido', async () => {
    findUnique.mockResolvedValue(USER)
    const { request, reply } = await run(validToken())
    expect(reply.status).not.toHaveBeenCalled()
    expect(request.user).toEqual(USER)
  })

  it('sem header: 401', async () => {
    const { reply } = await run()
    expect(reply.status).toHaveBeenCalledWith(401)
  })

  it('token inválido: 401 sem consultar o banco', async () => {
    const { reply } = await run('Bearer nao-e-um-jwt')
    expect(reply.status).toHaveBeenCalledWith(401)
    expect(findUnique).not.toHaveBeenCalled()
  })

  it('usuário não encontrado: 401', async () => {
    findUnique.mockResolvedValue(null)
    const { reply } = await run(validToken())
    expect(reply.status).toHaveBeenCalledWith(401)
  })

  it('banco indisponível: 503 AUTH_UNAVAILABLE (não 401, que deslogaria o usuário)', async () => {
    findUnique.mockRejectedValue(new Error("Can't reach database server"))
    const { request, reply } = await run(validToken())
    expect(reply.status).toHaveBeenCalledWith(503)
    expect(reply.send).toHaveBeenCalledWith(expect.objectContaining({ error: 'AUTH_UNAVAILABLE' }))
    expect(request.log.error).toHaveBeenCalled()
    expect(request.user).toBeUndefined()
  })
})
