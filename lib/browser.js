import puppeteer from 'puppeteer-core';
import { accessSync } from 'node:fs';

const CHROME_PATHS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];

function findChrome() {
  for (const p of CHROME_PATHS) {
    try { accessSync(p); return p; } catch { }
  }
  return null;
}

let browserInstance = null;

export async function getBrowser() {
  if (browserInstance) return browserInstance;
  const chromePath = findChrome();
  if (!chromePath) throw new Error('No Chrome/Edge found. Install Chrome or set PUPPETEER_CHROME_PATH.');
  browserInstance = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });
  return browserInstance;
}

export async function closeBrowser() {
  if (browserInstance) {
    try { await browserInstance.close(); } catch { }
    browserInstance = null;
  }
}

export async function analyzePage(browser, url) {
  const page = await browser.newPage();
  const result = { url, console: { errors: [], warnings: [], logs: [] }, metrics: {}, network: {}, errors: [] };

  page.on('console', (msg) => {
    const text = msg.text();
    if (msg.type() === 'error') result.console.errors.push(text);
    else if (msg.type() === 'warning') result.console.warnings.push(text);
    else result.console.logs.push(text);
  });

  page.on('pageerror', (err) => result.errors.push(err.message));

  const requests = [];
  page.on('request', (req) => {
    requests.push({ url: req.url(), type: req.resourceType() });
  });
  page.on('requestfailed', (req) => {
    result.errors.push(`Failed request: ${req.url()} (${req.failure().errorText})`);
  });

  try {
    await page.evaluateOnNewDocument(() => {
      window.__perfMetrics = {};
      try {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const last = entries[entries.length - 1];
          if (last) window.__perfMetrics.lcp = last.startTime;
        }).observe({ type: 'largest-contentful-paint', buffered: true });
      } catch { }
      try {
        let cls = 0;
        new PerformanceObserver((list) => {
          for (const e of list.getEntries()) { if (!e.hadRecentInput) cls += e.value; }
          window.__perfMetrics.cls = cls;
        }).observe({ type: 'layout-shift', buffered: true });
      } catch { }
      try {
        new PerformanceObserver((list) => {
          for (const e of list.getEntries()) { window.__perfMetrics.fcp = e.startTime; break; }
        }).observe({ type: 'paint', buffered: true });
      } catch { }
    });

    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

    const perf = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0];
      const pm = window.__perfMetrics || {};
      return {
        lcp: Math.round(pm.lcp || 0),
        cls: Math.round((pm.cls || 0) * 1000) / 1000,
        fcp: Math.round(pm.fcp || 0),
        domContentLoaded: nav ? Math.round(nav.domContentLoadedEventEnd) : 0,
        loadEventEnd: nav ? Math.round(nav.loadEventEnd) : 0,
        ttfb: nav ? Math.round(nav.responseStart) : 0,
        domInteractive: nav ? Math.round(nav.domInteractive) : 0,
        domNodes: document.querySelectorAll('*').length,
        textLength: document.body ? document.body.innerText.length : 0,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        title: document.title || '',
      };
    });

    result.metrics = perf;

    const resources = { 'document': 0, 'stylesheet': 0, 'script': 0, 'image': 0, 'font': 0, 'fetch': 0, 'xhr': 0, 'media': 0, 'other': 0 };
    let totalRequestSize = 0;
    for (const r of requests) {
      const t = r.type || 'other';
      resources[t] = (resources[t] || 0) + 1;
    }
    result.network = { totalRequests: requests.length, byType: resources };

    await page.close();
    return result;

  } catch (err) {
    result.errors.push(err.message);
    try { await page.close(); } catch { }
    return result;
  }
}
