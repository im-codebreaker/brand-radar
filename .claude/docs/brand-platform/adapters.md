# Brand Radar — Adapter & Scraping Strategy

> **Adapter architecture, anti-bot tactics, Playwright configuration, and source-specific patterns.**

---

## Table of Contents

1. [Adapter Architecture](#adapter-architecture)
2. [Anti-Bot Strategy](#anti-bot-strategy)
3. [Playwright Configuration](#playwright-configuration)
4. [Source-Specific Adapters](#source-specific-adapters)
5. [Rate Limiting & Backoff](#rate-limiting--backoff)
6. [Health Probes](#health-probes)

---

## Adapter Architecture

### Adapter Interface

Every scraping source implements one standard interface:

```typescript
interface ScraperAdapter {
  id: string
  sourceType: 'instagram' | 'tiktok' | 'website' | 'reddit' | 'etsy'

  configure(params: AdapterConfig): void
  discover(query: DiscoveryQuery): AsyncGenerator<RawCandidate>
  extract(url: string): Promise<ExtractedBrand>

  rateLimit: { requestsPerMinute: number; cooldownMs: number }
  probe(): Promise<AdapterHealth>
}
```

### Folder Structure

```
packages/adapters/
├── instagram/
│   ├── hashtag-crawler.ts
│   ├── profile-extractor.ts
│   └── config.schema.json
├── tiktok/
│   ├── keyword-crawler.ts
│   └── config.schema.json
├── web/
│   ├── generic-crawler.ts
│   ├── shopify-detector.ts
│   └── config.schema.json
├── reddit/
├── fragrantica/
└── ssense/
```

**Adding a new source:** Drop a new adapter folder. Zero changes to orchestration.

---

## Anti-Bot Strategy

### Detection Vectors

| Detection Method | How Platforms Use It | Mitigation |
|------------------|----------------------|------------|
| **User-Agent** | Flag known bot UAs (e.g., "HeadlessChrome") | Rotate real browser UAs |
| **Headless detection** | Check `navigator.webdriver`, `window.chrome` | Playwright stealth plugin |
| **TLS fingerprint** | Match TLS handshake to known browsers | Use real Chromium, not curl |
| **Behavioral signals** | Mouse movements, scroll patterns, timing | Human-like delays, random scrolling |
| **IP reputation** | Block datacenter IPs, require residential | Residential proxy rotation |
| **Rate limiting** | Track requests per IP/session | Exponential backoff, session rotation |
| **Captcha** | reCAPTCHA, hCaptcha on suspicious traffic | Manual solve queue, 2Captcha API |

---

### Tiered Scraping Strategy

```
Tier 1: Owned Sites (brand websites)
  - No anti-bot measures
  - Simple HTTP client OK
  - Rate limit: 1 req/sec per domain

Tier 2: Public Platforms (Reddit, Fragrantica)
  - Light anti-bot (rate limits, UAs)
  - Playwright with stealth
  - Rate limit: 10 req/min per platform

Tier 3: Social Platforms (Instagram, TikTok)
  - Aggressive anti-bot (fingerprinting, captchas)
  - Playwright + residential proxies + behavioral mimicry
  - Rate limit: 5 req/min per account
  - Session rotation every 100 requests
```

---

## Playwright Configuration

### Stealth Setup

```typescript
// packages/adapters/src/browser/config.ts
import { chromium } from 'playwright-extra'
import stealth from 'puppeteer-extra-plugin-stealth'

chromium.use(stealth())

export async function createBrowserContext(options?: {
  proxy?: ProxyConfig
  userAgent?: string
}) {
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
    ],
  })

  const context = await browser.newContext({
    userAgent: options?.userAgent || getRandomUserAgent(),
    viewport: { width: 1920, height: 1080 },
    locale: 'en-US',
    timezoneId: 'America/New_York',
    proxy: options?.proxy,
  })

  // Remove webdriver flag
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
  })

  return { browser, context }
}
```

### Behavioral Mimicry

```typescript
async function humanLikeScroll(page: Page) {
  const scrollHeight = await page.evaluate(() => document.body.scrollHeight)
  let currentPosition = 0

  while (currentPosition < scrollHeight) {
    const scrollAmount = Math.random() * 300 + 200  // 200-500px
    await page.evaluate((y) => window.scrollBy(0, y), scrollAmount)
    currentPosition += scrollAmount

    // Random pause (500ms - 2s)
    await page.waitForTimeout(Math.random() * 1500 + 500)
  }
}

async function randomMouseMovement(page: Page) {
  const x = Math.random() * 1000
  const y = Math.random() * 700
  await page.mouse.move(x, y)
}
```

---

## Source-Specific Adapters

### Instagram Adapter

**Challenges:**
- Requires login (session cookies)
- Heavy fingerprinting
- Rate limits per account (~100 req/hour)

**Strategy:**
- Playwright with logged-in session
- Rotate accounts every 100 requests
- Residential proxies
- Hashtag discovery via `/explore/tags/<hashtag>/`

**Extraction:**
```typescript
async extract(profileUrl: string): Promise<ExtractedBrand> {
  const page = await context.newPage()
  await page.goto(profileUrl, { waitUntil: 'networkidle' })

  const data = await page.evaluate(() => {
    const meta = document.querySelector('meta[property="og:description"]')?.content
    const followers = meta?.match(/(\d+) Followers/)?.[1]
    const name = document.querySelector('h2')?.textContent

    return { name, followers: parseInt(followers || '0') }
  })

  await page.close()
  return data
}
```

---

### TikTok Adapter

**Challenges:**
- No official search API (Research API requires approval)
- Aggressive bot detection
- Video-heavy (slow page loads)

**Strategy:**
- Playwright with stealth
- Use `/search/user?q=<keyword>` endpoint
- Residential proxies
- Wait for hydration (React SSR)

---

### Web Crawler (Generic)

**Challenges:**
- Diverse site structures (Shopify, WooCommerce, custom)
- Some sites block crawlers (robots.txt, 403s)

**Strategy:**
- Start with `robots.txt` check
- Detect platform via meta tags, DOM structure
- Shopify: `<meta name="shopify-digital-wallet">`, `/collections/all.json`
- WooCommerce: `<meta name="generator" content="WooCommerce">`
- Extract structured data: JSON-LD, Open Graph tags

---

### Reddit Adapter

**Strategy:**
- Use official Reddit API (requires OAuth app)
- Search subreddits (r/fragrance, r/indiemakeupandmore) for brand mentions
- Extract brand names via keyword regex
- Rate limit: 60 req/min per OAuth token

---

## Rate Limiting & Backoff

### Rate Limit Enforcement

```typescript
// packages/adapters/src/rate-limiter.ts
import Bottleneck from 'bottleneck'

const limiters = new Map<string, Bottleneck>()

export function getRateLimiter(adapterId: string, config: RateLimitConfig) {
  if (!limiters.has(adapterId)) {
    limiters.set(adapterId, new Bottleneck({
      minTime: config.minTimeBetweenRequests,  // ms
      maxConcurrent: config.maxConcurrent,
      reservoir: config.reservoir,             // Max requests per interval
      reservoirRefreshAmount: config.reservoir,
      reservoirRefreshInterval: config.interval,  // ms
    }))
  }

  return limiters.get(adapterId)!
}
```

### Exponential Backoff

```typescript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      if (isRateLimitError(error) && attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000  // 1s, 2s, 4s
        await sleep(delay)
      } else {
        throw error
      }
    }
  }
  throw new Error('Max retries exceeded')
}
```

---

## Health Probes

### Daily Canary Tests

Each adapter runs a **known-good URL** daily to detect breakage:

```typescript
interface AdapterHealth {
  adapterId: string
  status: 'healthy' | 'degraded' | 'down'
  lastProbeAt: Date
  lastSuccessAt: Date
  errorMessage?: string
}

async function probe(): Promise<AdapterHealth> {
  try {
    const testUrl = this.config.canaryUrl  // e.g., known Instagram profile
    const result = await this.extract(testUrl)
    
    if (!result.name) {
      return {
        adapterId: this.id,
        status: 'degraded',
        lastProbeAt: new Date(),
        errorMessage: 'Extraction returned incomplete data',
      }
    }

    return {
      adapterId: this.id,
      status: 'healthy',
      lastProbeAt: new Date(),
      lastSuccessAt: new Date(),
    }
  } catch (error) {
    return {
      adapterId: this.id,
      status: 'down',
      lastProbeAt: new Date(),
      errorMessage: error.message,
    }
  }
}
```

### Alerting

- **Degraded:** Slack warning
- **Down > 2 hours:** PagerDuty critical
- **Extraction success rate < 80%:** Slack warning

---

## Adapter Versioning

When a platform changes structure:
1. Create new adapter version: `instagram-v2/`
2. Run both versions in parallel (blue/green)
3. Compare extraction results
4. Switch traffic to new version once validated
5. Deprecate old version after 7 days

---

**Next Steps:**
1. Review [Pipeline Architecture](./pipeline.md) for worker orchestration
2. Review [Schema Design](./schema.md) for data model
3. Implement adapters in `packages/adapters/`
