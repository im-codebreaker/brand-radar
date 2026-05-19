import antfu from '@antfu/eslint-config'

/**
 * Shared ESLint config for brand-radar. Wraps @antfu/eslint-config.
 * Pass { vue: true } in app configs that consume Vue files.
 */
export default function stackitConfig(options = {}, ...userConfigs) {
  return antfu(
    {
      typescript: true,
      vue: options?.vue ?? false,
      stylistic: {
        indent: 2,
        quotes: 'single',
        semi: false,
      },
      ...options,
    },
    ...userConfigs,
  )
}
