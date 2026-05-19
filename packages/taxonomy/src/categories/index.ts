// Category definitions - placeholder
export const CATEGORIES = {
  CLOTHING: 'clothing',
  PERFUME: 'perfume',
} as const

export type Category = typeof CATEGORIES[keyof typeof CATEGORIES]
