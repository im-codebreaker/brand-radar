import type { RedisClientType as BaseRedisClientType } from 'redis'
import { createClient } from 'redis'

export type RedisClientType = BaseRedisClientType

export interface CacheConfig {
  host?: string
  port?: number
  password?: string
}

export function createCacheClient(config: CacheConfig = {}): RedisClientType {
  const { host = 'localhost', port = 6379, password } = config

  const client = createClient({
    url: `redis://${host}:${port}`,
    ...(password ? { password } : {}),
  })

  client.on('error', err => console.error('[redis]', err))

  return client as RedisClientType
}
