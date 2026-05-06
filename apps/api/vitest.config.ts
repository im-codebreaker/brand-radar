import type { Plugin } from 'vite'
import { defineConfig } from 'vitest/config'

/**
 * NodeNext requires `.js` extensions in TS source. Vite/Vitest don't
 * resolve those out of the box. This plugin strips `.js` from relative
 * imports so vitest can locate the underlying `.ts` files.
 */
const stripJsExtension: Plugin = {
  name: 'strip-js-ext-for-vitest',
  enforce: 'pre',
  async resolveId(source, importer) {
    if (!importer)
      return null
    if (!/^\.{1,2}\//.test(source) || !source.endsWith('.js'))
      return null
    const resolved = await this.resolve(source.replace(/\.js$/, ''), importer, { skipSelf: true })
    return resolved
  },
}

export default defineConfig({
  plugins: [stripJsExtension],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['./tests/setup.ts'],
    server: {
      deps: {
        inline: [/^@fastify\//, /^fastify-plugin$/],
      },
    },
  },
})
