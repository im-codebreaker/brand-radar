import type { IncomingHttpHeaders } from 'node:http'

/**
 * Converts Fastify's IncomingHttpHeaders to Web API Headers object
 * compatible with HeadersInit type.
 *
 * @param incomingHeaders - Fastify request headers
 * @returns Headers object that can be used with web APIs
 */
export function convertToWebHeaders(incomingHeaders: IncomingHttpHeaders): Headers {
  const headers = new Headers()

  Object.entries(incomingHeaders).forEach(([key, value]) => {
    if (value) {
      headers.append(key, value.toString())
    }
  })

  return headers
}
