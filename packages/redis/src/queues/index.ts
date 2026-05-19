// Queue definitions will be implemented later
// Placeholder for: discovery, crawl, social, embeddings, scoring, indexing queues
export const QUEUE_NAMES = {
  DISCOVERY: 'discovery',
  CRAWL: 'crawl',
  SOCIAL: 'social',
  EMBEDDINGS: 'embeddings',
  SCORING: 'scoring',
  INDEXING: 'indexing',
} as const

export type QueueName = typeof QUEUE_NAMES[keyof typeof QUEUE_NAMES]
