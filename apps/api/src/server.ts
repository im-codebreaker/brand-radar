import process from 'node:process'
import closeWithGrace from 'close-with-grace'
import { build } from './app.js'
import { env } from './config/env.js'

const app = await build()

closeWithGrace({ delay: env.CLOSE_GRACE_DELAY }, async ({ err }: { err?: Error }) => {
  if (err)
    app.log.error(err)
  await app.close()
})

try {
  await app.listen({ host: env.API_HOST, port: env.API_PORT })
}
catch (err) {
  app.log.error(err)
  process.exit(1)
}
