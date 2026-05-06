import process from 'node:process'
import { PrismaClient } from '../generated/prisma/client.js'

const prisma = new PrismaClient()

async function main() {
  const demo = await prisma.user.upsert({
    where: { email: 'demo@stackit.dev' },
    update: {},
    create: {
      email: 'demo@stackit.dev',
      name: 'Demo User',
    },
  })

  console.warn(`Seeded user: ${demo.email}`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
