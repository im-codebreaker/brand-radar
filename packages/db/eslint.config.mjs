import config from '@stackit/eslint-config'

export default config({}, {
  ignores: ['generated/**', 'prisma/migrations/**'],
})
