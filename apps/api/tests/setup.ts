import process from 'node:process'

// Inject env vars before app modules are imported
process.env.NODE_ENV ??= 'test'
process.env.DATABASE_URL ??= 'postgresql://test:test@localhost:5432/test'
process.env.BASE_URL ??= 'http://localhost'
process.env.LOG_LEVEL ??= 'silent'
process.env.BETTER_AUTH_SECRET ??= 'test-secret-at-least-16-chars-long'
process.env.BETTER_AUTH_URL ??= 'http://localhost'
