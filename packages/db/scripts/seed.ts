/**
 * Brand Radar Database Seeder
 *
 * Seeds development/testing data with better-auth support. Run with: pnpm db:seed
 *
 * IMPORTANT:
 * - Safe to run multiple times (uses onConflictDoNothing)
 * - Environment-aware: skips seeding in production
 */

import process from 'node:process'
import { bytesToHex, randomBytes } from '@noble/hashes/utils'
import { scryptAsync } from '@noble/hashes/scrypt'
import { createDatabaseClient } from '../src/client.js'
import { accounts, users } from '../src/schema/index.js'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error('❌ DATABASE_URL is not set')
  process.exit(1)
}

const db = createDatabaseClient({ url: databaseUrl })

// Environment detection
const isProduction = process.env.NODE_ENV === 'production'
const isDevelopment = !isProduction

// ============================================================================
// PASSWORD HASHING UTILITY
// ============================================================================

/**
 * Hash password using scrypt (EXACT better-auth implementation)
 * CRITICAL: Salt must be hex-encoded STRING before passing to scryptAsync
 * Parameters: N=16384, r=16, p=1, dkLen=64, maxmem=128*N*r*2
 */
async function hashPassword(password: string): Promise<string> {
  // Generate 16 random bytes and hex-encode to string (32 chars)
  const salt = bytesToHex(randomBytes(16))

  // Normalize password to NFKC form (Unicode normalization)
  const normalizedPassword = password.normalize('NFKC')

  // Pass hex string as salt (scryptAsync will convert to UTF-8 bytes)
  const derivedKey = await scryptAsync(normalizedPassword, salt, {
    N: 16384,
    r: 16,
    p: 1,
    dkLen: 64,
    maxmem: 128 * 16384 * 16 * 2,
  })

  return `${salt}:${bytesToHex(derivedKey)}`
}

// ============================================================================
// DEVELOPMENT DATA SEEDING
// ============================================================================

/**
 * Seed development users for testing
 */
async function seedUsers() {
  if (isProduction) {
    console.log('⏭️  Skipping user seeding in production')
    return []
  }

  console.log('👥 Seeding development users...')

  const devUsers = [
    {
      name: 'Admin User',
      email: 'admin@brand-radar.dev',
    },
    {
      name: 'Brand Analyst',
      email: 'analyst@brand-radar.dev',
    },
    {
      name: 'Viewer User',
      email: 'viewer@brand-radar.dev',
    },
    {
      name: 'Demo User',
      email: 'demo@brand-radar.dev',
    },
  ]

  const createdUsers = []

  for (const userData of devUsers) {
    const [inserted] = await db
      .insert(users)
      .values(userData)
      .onConflictDoNothing({ target: users.email })
      .returning()

    if (inserted) {
      console.log(`  ✓ Created user: ${userData.email}`)
      createdUsers.push(inserted)
    }
    else {
      console.log(`  ⏭️  User already exists: ${userData.email}`)
    }
  }

  return createdUsers
}

/**
 * Seed development user accounts with passwords
 */
async function seedAccounts(createdUsers: Array<{ id: string, email: string }>) {
  if (isProduction) {
    console.log('⏭️  Skipping account seeding in production')
    return
  }

  if (createdUsers.length === 0) {
    console.log('⏭️  No new users to create accounts for')
    return
  }

  console.log('🔑 Seeding development accounts with passwords...')

  const defaultPassword = 'password123' // Default dev password
  const hashedPassword = await hashPassword(defaultPassword)

  for (const user of createdUsers) {
    const accountData = {
      id: `account_${user.id}`,
      accountId: user.id,
      providerId: 'credential',
      userId: user.id,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const [inserted] = await db
      .insert(accounts)
      .values(accountData)
      .onConflictDoNothing({ target: accounts.id })
      .returning()

    if (inserted) {
      console.log(`  ✓ Created account for: ${user.email}`)
    }
    else {
      console.log(`  ⏭️  Account already exists for: ${user.email}`)
    }
  }

  console.log(`  ℹ️  Default password for all dev accounts: ${defaultPassword}`)
}

// ============================================================================
// MAIN SEED FUNCTION
// ============================================================================

/**
 * Main seed function
 */
async function main() {
  console.log('🌱 Starting database seeding...\n')

  try {
    if (isDevelopment) {
      const createdUsers = await seedUsers()
      await seedAccounts(createdUsers)
    }

    console.log('\n✅ Database seeding completed successfully!')
  }
  catch (error) {
    console.error('\n❌ Error during seeding:', error)
    throw error
  }
}

// Execute seeding
main()
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
