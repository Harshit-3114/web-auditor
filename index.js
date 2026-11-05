#!/usr/bin/env node

import { fetchPage } from './lib/fetcher.js';
import { parseHtml } from './lib/parser.js';
import { crawlSite } from './lib/crawler.js';
import { getBrowser, closeBrowser, analyzePage } from './lib/browser.js';
import { auditSeo, auditUx, auditPerformance, auditSecurity, auditDuplicates } from './lib/audits.js';
import { generateTeamTasks } from './lib/suggestions.js';
import { printReport } from './lib/reporter.js';

function parseArgs() {
  const args = process.argv.slice(2);
  const config = { url: null, maxPages: 30, maxDepth: 2, noBrowser: false, json: false, platform: null };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--help' || args[i] === '-h') return null;
    if (args[i] === '--max-pages' || args[i] === '-p') config.maxPages = parseInt(args[++i]) || 30;
    else if (args[i] === '--depth' || args[i] === '-d') config.maxDepth = parseInt(args[++i]) || 2;
    else if (args[i] === '--no-browser') config.noBrowser = true;
    else if (args[i] === '--json') config.json = true;
    else if (args[i] === '--platform') config.platform = args[++i];
    else if (!args[i].startsWith('-')) config.url = args[i];
  }
  return config;
}

function printHelp() {
  console.log('');
  console.log('  web-auditor — Full-site performance, UX, SEO, security & duplicate analysis');
  console.log('');
  console.log('  Usage:');
  console.log('    node index.js <url> [options]');
  console.log('');
  console.log('  Options:');
  console.log('    -p, --max-pages N    Max pages to analyze (default: 30)');
  console.log('    -d, --depth N        Max crawl depth (default: 2)');
  console.log('    --platform <name>     Filter for platform: wix (shows only fixable items)');
  console.log('    --no-browser          Skip Chromium browser analysis (HTTP only)');
  console.log('    --json                Output results as JSON');
  console.log('    -h, --help            Show this help');
  console.log('');
  console.log('  Examples:');
  console.log('    node index.js https://mysite.com -p 20 -d 3');
  console.log('    node index.js https://mysite.com --platform wix        # Wix-specific fixes');
  console.log('');
}

async function main() {
  const config = parseArgs();
  if (!config) { printHelp(); process.exit(0); }

  let url = config.url;
  if (!url) { printHelp(); process.exit(1); }
  if (!url.startsWith('http://') && !url.startsWith('https://')) url = 'https://' + url;

  const startTime = Date.now();

  console.log(`╔════════════════════════════════════════════════════╗`);
  console.log(`║  WEB AUDITOR — Site Analysis`);
  console.log(`║  Target: ${url}`);
  if (config.platform) console.log(`║  Platform: ${config.platform}`);
  console.log(`╚════════════════════════════════════════════════════╝`);
  console.log('');

  // ── Step 1: Crawl site ──
  console.log(`  [1/3] Crawling site (max ${config.maxPages} pages, depth ${config.maxDepth})...`);
  const crawlInfo = await crawlSite(url, { maxPages: config.maxPages, maxDepth: config.maxDepth });
  console.log(`        Discovered ${crawlInfo.discovered.length} internal pages`);
  console.log('');

  // ── Step 2: Launch browser ──
  let browser = null;
  if (!config.noBrowser) {
    try {
      browser = await getBrowser();
      console.log('  [2/3] Browser launched (Chromium)');
    } catch (err) {
      console.log(`  [!] Browser unavailable: ${err.message}. Falling back to HTTP-only mode.`);
    }
  } else {
    console.log('  [2/3] Browser analysis skipped (--no-browser)');
  }
  console.log('');

  // ── Step 3: Analyze each page ──
  console.log(`  [3/3] Analyzing ${crawlInfo.discovered.length} pages...`);
  const allResults = [];

  for (let i = 0; i < crawlInfo.discovered.length; i++) {
    const page = crawlInfo.discovered[i];
    const pageNum = i + 1;
    const path = page.url.split('/').slice(3).join('/') || '/';
    process.stdout.write(`        [${pageNum}/${crawlInfo.discovered.length}] ${path}`);

    try {
      const fetchResp = await fetchPage(page.url);
      const parsed = parseHtml(fetchResp.body, page.url);

      let browserData = null;
      if (browser) {
        try {
          browserData = await analyzePage(browser, page.url);
        } catch { }
      }

      const audits = {
        seo: auditSeo(parsed, browserData, page.url),
        ux: auditUx(parsed, browserData, page.url),
        perf: auditPerformance(fetchResp, parsed, browserData, page.url),
        sec: auditSecurity(fetchResp, parsed, browserData, page.url),
        dups: auditDuplicates(parsed, browserData, page.url),
      };

      const total = Object.values(audits).reduce((s, a) => s + a.issues.length, 0);
      const high = Object.values(audits).reduce((s, a) => s + a.issues.filter(i => i.severity === 'high').length, 0);

      allResults.push({ url: page.url, audits, parsed, browserData, errors: browserData?.errors || [] });
      process.stdout.write(` — ${total} issues${high > 0 ? ` (${high} high)` : ''}\n`);
    } catch (err) {
      allResults.push({ url: page.url, audits: { seo: { issues: [], passed: [] }, ux: { issues: [], passed: [] }, perf: { issues: [], passed: [] }, sec: { issues: [], passed: [] }, dups: { issues: [], passed: [] } }, errors: [err.message] });
      process.stdout.write(` — ERROR: ${err.message.slice(0, 60)}\n`);
    }
  }

  // ── Cleanup ──
  if (browser) await closeBrowser();

  // ── Generate suggestions ──
  const suggestions = generateTeamTasks(allResults, config.platform);

  // ── Output ──
  const totalTime = Date.now() - startTime;

  if (config.json) {
    console.log(JSON.stringify({ crawl: crawlInfo, pages: allResults, suggestions, totalTimeMs: totalTime }, null, 2));
  } else {
    printReport(allResults, suggestions, crawlInfo, totalTime, config.platform);

    if (config.maxPages <= crawlInfo.discovered.length) {
      console.log(`  Note: Reached page limit (${config.maxPages}). Use --max-pages to increase.`);
      console.log('');
    }
  }
}

main();
