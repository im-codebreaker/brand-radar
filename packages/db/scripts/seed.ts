import process from 'node:process'
import { createDatabaseClient } from '../src/client.js'
import { users } from '../src/schema/users.js'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error('DATABASE_URL is not set')
  process.exit(1)
}

const db = createDatabaseClient({ url: databaseUrl })

async function main() {
  const [demo] = await db
    .insert(users)
    .values({ email: 'demo@stackit.dev', name: 'Demo User' })
    .onConflictDoNothing({ target: users.email })
    .returning()

  console.warn(`Seeded user: ${demo?.email ?? 'demo@stackit.dev (already existed)'}`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
