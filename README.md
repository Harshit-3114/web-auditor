# Web Auditor

Full-site analysis for **SEO, UX/accessibility, performance, security** and **duplicate content** — crawl a site, audit every page, and get an actionable report grouped by team.

Built as a CLI because site audits are a batch job: you point it at a URL, it does the tedious part, and hands you a list somebody can actually act on.

```
node index.js https://example.com
```

---

## Why

Auditing a site page-by-page in devtools is slow, inconsistent, and easy to skip the boring-but-important checks. This tool:

- crawls the whole site automatically, following internal links up to a configurable depth
- runs **77 checks** across five audit categories
- uses a real headless Chromium to collect what static HTML analysis cannot see — Core Web Vitals, console errors, actual layout
- groups findings by **team** (SEO / design / dev / security) so the output maps to who fixes what
- can output JSON for CI pipelines

---

## Quick Start

```bash
npm install

# Audit a site
node index.js https://example.com

# Go deeper, more pages
node index.js https://example.com -p 100 -d 3

# Skip the browser (HTTP-only, much faster)
node index.js https://example.com --no-browser

# Machine-readable output
node index.js https://example.com --json > audit.json
```

### Prerequisites

- **Node.js 18+**
- **Chromium/Chrome** — only for browser-mode audits. Point `puppeteer-core` at your installed browser (see [Browser setup](#browser-setup)).

---

## CLI

```
web-auditor — Full-site performance, UX, SEO, security & duplicate analysis

Usage:
  node index.js <url> [options]

Options:
  -p, --max-pages N    Max pages to analyze (default: 30)
  -d, --depth N        Max crawl depth (default: 2)
  --platform <name>    Filter for platform: wix (shows only fixable items)
  --no-browser         Skip Chromium browser analysis (HTTP only)
  --json               Output results as JSON
  -h, --help           Show this help
```

| Option | Default | Meaning |
|---|---|---|
| `-p, --max-pages` | 30 | Hard cap on pages crawled |
| `-d, --depth` | 2 | Link-following depth from the seed URL |
| `--platform` | — | Platform-specific fix guidance (currently `wix`) |
| `--no-browser` | off | HTTP-only mode — skips Chromium entirely |
| `--json` | off | Machine-readable output for piping into other tools |

---

## What It Checks

### SEO — 10 checks

Title presence and length (10–60 chars), meta description (120–160 chars), canonical URL, viewport meta tag, `noindex` detection, `hreflang` annotations, Open Graph tags (`title`, `description`, `image`), Twitter Card tags, outbound external links.

### UX / Accessibility — 21 checks

Heading hierarchy (missing/multiple H1, skipped levels, non-descriptive headings), image `alt` text, image dimensions (CLS prevention), lazy loading, generic link text ("click here"), `target="_blank"` without `rel="noopener"`, `lang` attribute, form input labels, form submit buttons, empty/unlabelled buttons, ARIA roles, excessive `tabindex`, iframe titles, third-party font loading (FOIT), thin content, leaked `TODO`/`FIXME` HTML comments, and browser console errors.

### Performance — 16 checks

TTFB (time to first byte), page weight, compression (gzip/brotli), cache headers and TTL, `preconnect` hints, render-blocking scripts, script count, stylesheet count, inline `<style>` bloat, third-party domain count, and from real browser metrics: **LCP**, **CLS**, **FCP**, DOM size.

### Security — 14 checks

HTTPS enforcement, HSTS header and `max-age`, Content-Security-Policy, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, exposed `Server` / `X-Powered-By` headers, cookie `HttpOnly` / `Secure` / `SameSite` flags, Subresource Integrity on CDN scripts, reverse-tabnapping risk, inline event handlers (XSS surface), exposed email addresses, and missing `charset`.

### Duplicate Content — 3 checks

Duplicate element `id`s, duplicate meta tag names, and repeated content across pages.

Every finding carries a **severity** (`high` / `medium` / `low`), a **team** (`seo` / `design` / `dev` / `security`), and a remediation note.

---

## Platform-Specific Fixes

Some issues are only fixable through a CMS dashboard rather than in code. Pass `--platform wix` to filter the report down to the items that are actually actionable in a Wix dashboard, with the exact navigation path for each:

```bash
node index.js https://mysite.com --platform wix
```

```
→  Missing <title> tag
   Fix: Wix Dashboard → Pages → page Settings → SEO → Title tag
```

---

## Browser Setup

`web-auditor` uses `puppeteer-core`, which does **not** download its own Chromium. Point it at an installed browser in `lib/browser.js`:

```js
const executablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
```

Common paths:

| Platform | Path |
|---|---|
| Windows | `C:\Program Files\Google\Chrome\Application\chrome.exe` |
| macOS | `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome` |
| Linux | `/usr/bin/google-chrome` |

If the browser cannot launch, the tool **falls back to HTTP-only mode** automatically rather than failing — you'll see a warning and the audit continues.

---

## Architecture

```
index.js            CLI entry — arg parsing, orchestration, output
├── lib/
│   ├── crawler.js      BFS crawl of internal links, depth + page limits
│   ├── fetcher.js      HTTP fetch with timing and response headers
│   ├── parser.js       Cheerio-based DOM extraction (meta, headings, links, forms…)
│   ├── browser.js      Chromium via puppeteer-core — console errors, Core Web Vitals
│   ├── audits.js       The 77 checks across SEO / UX / perf / security / duplicates
│   ├── performance.js  Browser-metric extraction helpers
│   ├── security.js     Header and cookie analysis helpers
│   ├── platform.js     Platform-specific fix mapping (Wix)
│   ├── suggestions.js  Findings → team-scoped task suggestions
│   └── reporter.js     Terminal report rendering
```

The pipeline per page is:

```
fetch → parse (Cheerio) → browser analyse (Chromium) → audit × 5 → aggregate
```

HTTP data and browser data are complementary: the parser sees the source, the browser sees what actually rendered.

---

## Project Structure

```
web-auditor/
├── index.js          # CLI entry point
├── lib/              # 10 modules — crawl, fetch, parse, browser, audits, report
├── package.json
├── LICENSE
└── README.md
```

---

## License

MIT — see [LICENSE](LICENSE).
