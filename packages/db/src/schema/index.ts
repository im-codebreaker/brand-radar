/* eslint-disable perfectionist/sort-exports */
// Order matters: ./users.js must stay outside the BETTER_AUTH_SCHEMA marker
// so it survives `pnpm setup` pruning when auth is declined.
export * from './users.js'
// BETTER_AUTH_SCHEMA_START — pruned by `pnpm setup` if auth declined
export * from './auth.js'
// BETTER_AUTH_SCHEMA_END
