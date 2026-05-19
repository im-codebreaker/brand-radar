export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    // Strip combining marks (accents) — Unicode property escape, requires `u` flag.
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function truncate(input: string, max: number, suffix = '…'): string {
  if (input.length <= max)
    return input
  return input.slice(0, Math.max(0, max - suffix.length)) + suffix
}
