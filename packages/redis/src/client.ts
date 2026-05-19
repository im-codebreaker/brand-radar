import { Redis } from 'ioredis'

export type RedisClientType = Redis

export interface RedisConfig {
  host?: string
  port?: number
  password?: string
}

export function createRedisClient(config: RedisConfig = {}): RedisClientType {
  const { host = 'localhost', port = 6379, password } = config

  const client = new Redis({
    host,
    port,
    password,
    lazyConnect: true,
  })

  client.on('error', (err: Error) => {
    // eslint-disable-next-line no-console
    console.error('[redis]', err)
  })

  return client
}
