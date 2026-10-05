// @investpro/server
// O handler da função serverless entrega a requisição ao mesmo app do
// buildServer(): mesmas rotas e mesmos erros, sem app.listen.

import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import handler from '../serverless.js'

let server: Server
let baseUrl = ''

beforeAll(async () => {
  server = createServer((req, res) => void handler(req, res))
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()))
})

describe('handler serverless', () => {
  it('responde /health', async () => {
    const res = await fetch(`${baseUrl}/health`)

    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ status: 'ok' })
  })

  it('reaproveita a instância entre requisições e mantém o 404 padrão', async () => {
    const [first, second] = await Promise.all([fetch(`${baseUrl}/health`), fetch(`${baseUrl}/api/v1/nao-existe`)])

    expect(first.status).toBe(200)
    expect(second.status).toBe(404)
    expect(await second.json()).toMatchObject({ error: 'NOT_FOUND' })
  })
})
