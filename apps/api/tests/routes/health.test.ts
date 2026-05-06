import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildTestApp } from '../helpers/test-app.js'

// eslint-disable-next-line test/prefer-lowercase-title
describe('GET /api/v1/health', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await buildTestApp()
  })

  afterAll(async () => {
    await app.close()
  })

  it('returns ok status', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/health' })
    expect(res.statusCode).toBe(200)
    const body = res.json() as { status: string, uptime: number }
    expect(body.status).toBe('ok')
    expect(typeof body.uptime).toBe('number')
  })
})
