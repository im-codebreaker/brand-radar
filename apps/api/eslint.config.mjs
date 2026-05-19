import config from '@brand-radar/eslint-config'

export default config({}, {
  rules: {
    'antfu/no-top-level-await': 'off',
    'node/prefer-global/process': 'off',
  },
})
