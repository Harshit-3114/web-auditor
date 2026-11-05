import { fetchPage } from './fetcher.js';
import * as cheerio from 'cheerio';
import { URL } from 'node:url';

function normalizeUrl(href, base) {
  try {
    const url = new URL(href, base);
    url.hash = '';
    url.pathname = url.pathname.replace(/\/$/, '') || '/';
    return url.href;
  } catch {
    return null;
  }
}

function isSameOrigin(url, baseUrl) {
  try {
    return new URL(url).hostname === new URL(baseUrl).hostname;
  } catch {
    return false;
  }
}

function isHtmlUrl(url) {
  const skipExtensions = /\.(pdf|zip|tar|gz|rar|exe|dmg|iso|mp3|mp4|avi|mov|wmv|flv|webm|png|jpg|jpeg|gif|svg|webp|bmp|ico|css|js|json|xml|csv|doc|docx|xls|xlsx|ppt|pptx|woff|woff2|ttf|eot|otf)$/i;
  return !skipExtensions.test(url.pathname);
}

export async function crawlSite(baseUrl, { maxPages = 30, maxDepth = 3 } = {}) {
  const origin = new URL(baseUrl).origin;
  const visited = new Set();
  const queue = [{ url: normalizeUrl(baseUrl, baseUrl), depth: 0 }];
  const discovered = [];
  let pagesFetched = 0;

  while (queue.length > 0 && visited.size < maxPages) {
    const entry = queue.shift();
    if (!entry || !entry.url || visited.has(entry.url)) continue;
    visited.add(entry.url);

    try {
      const response = await fetchPage(entry.url);
      pagesFetched++;

      discovered.push({
        url: entry.url,
        depth: entry.depth,
        statusCode: response.statusCode,
      });

      if (entry.depth < maxDepth && response.body) {
        const $ = cheerio.load(response.body);
        $('a[href]').each((_, el) => {
          const href = $(el).attr('href');
          if (!href || href.startsWith('javascript:') || href.startsWith('#')) return;
          const normalized = normalizeUrl(href, entry.url);
          if (!normalized || !isSameOrigin(normalized, baseUrl)) return;
          const urlObj = new URL(normalized);
          if (!isHtmlUrl(urlObj)) return;
          if (!visited.has(normalized) && !queue.some(e => e && e.url === normalized)) {
            queue.push({ url: normalized, depth: entry.depth + 1 });
          }
        });
      }
    } catch { }
  }

  return { discovered, totalPages: discovered.length, totalFetched: pagesFetched };
}
