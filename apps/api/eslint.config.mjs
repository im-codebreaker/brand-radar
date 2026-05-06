import config from '@stackit/eslint-config'

export default config({}, {
  rules: {
    'antfu/no-top-level-await': 'off',
    'node/prefer-global/process': 'off',
  },
})
