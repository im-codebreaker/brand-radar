# ADR-001: Playwright Only

**Status:** Accepted  
**Date:** 2026-05-22  
**Deciders:** Engineering team  

---

## Context

Brand Radar requires headless browser automation for scraping dynamic social platforms (Instagram, TikTok) and JavaScript-heavy ecommerce sites. We evaluated three tools:

- **Puppeteer** (Chromium-only, Node.js native)
- **Selenium** (Multi-browser, Java-originated, WebDriver protocol)
- **Playwright** (Multi-browser, modern API, anti-bot stealth)

---

## Decision

We will use **Playwright** exclusively for all browser automation in Brand Radar.

---

## Rationale

### Why Playwright Over Puppeteer

| Aspect | Playwright | Puppeteer |
|--------|-----------|-----------|
| **Browsers** | Chromium, Firefox, WebKit | Chromium only |
| **API design** | Modern async/await, auto-waiting | More manual waiting |
| **Stealth** | `playwright-extra` plugin ecosystem | Less mature |
| **Network interception** | Built-in HAR recording | Requires manual CDP |
| **Maintained by** | Microsoft (active) | Google (slower updates) |

Playwright's multi-browser support is future-proofing — if Instagram/TikTok fingerprinting gets better, we can test Firefox/WebKit for evasion. Puppeteer locks us into Chromium.

---

### Why Playwright Over Selenium

| Aspect | Playwright | Selenium |
|--------|-----------|----------|
| **API ergonomics** | Native async/await | Callback-heavy, verbose |
| **Performance** | Faster (native protocol) | Slower (WebDriver overhead) |
| **Stealth** | Better anti-bot evasion | Detectable via `navigator.webdriver` |
| **TypeScript** | First-class support | Third-party typings |

Selenium's WebDriver protocol is detectable by anti-bot systems (sets `navigator.webdriver = true`). Playwright's stealth plugins remove this flag and other fingerprinting signals.

---

## Consequences

### Positive

- **One tool, one API:** No context-switching between Puppeteer for simple sites and Selenium for complex ones.
- **Stealth-first:** `playwright-extra` stealth plugin works out of the box.
- **Future-proof:** Multi-browser support if we need to pivot away from Chromium.
- **Active ecosystem:** Microsoft-backed, fast updates, growing community.

### Negative

- **Learning curve:** Team must learn Playwright-specific patterns (locators, auto-waiting).
- **Dependency size:** Playwright bundles browsers (~200MB per browser), but we only use Chromium in production.

---

## Mitigation

- **Training:** Document Playwright patterns in `adapters.md` and `scraping-expert` agent.
- **Selective install:** Use `pnpm install playwright --with-deps chromium` to avoid unused browsers.

---

## Alternatives Considered

1. **Puppeteer + Selenium hybrid:** Rejected due to maintenance burden (two APIs, two stealth configs).
2. **HTTP-only scraping (curl + Cheerio):** Rejected because Instagram/TikTok require JavaScript execution.
3. **Official APIs:** Preferred where available (Reddit API), but Instagram/TikTok APIs are restrictive or unavailable.

---

## References

- [Playwright Documentation](https://playwright.dev/)
- [playwright-extra Stealth Plugin](https://github.com/berstend/puppeteer-extra/tree/master/packages/puppeteer-extra-plugin-stealth)
- [Adapter Strategy](../brand-platform/adapters.md)
