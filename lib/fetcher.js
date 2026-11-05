import https from 'node:https';
import http from 'node:http';
import { URL } from 'node:url';

export async function fetchPage(urlStr, maxRedirects = 5) {
  let url = new URL(urlStr);
  let redirects = 0;
  let finalUrl = url.href;

  while (redirects <= maxRedirects) {
    const protocol = url.protocol === 'https:' ? https : http;
    const result = await new Promise((resolve, reject) => {
      const start = Date.now();
      const req = protocol.get(url.href, { rejectUnauthorized: false, timeout: 30000 }, (res) => {
        const responseTime = Date.now() - start;
        const isRedirect = res.statusCode >= 300 && res.statusCode < 400 && res.headers.location;

        if (isRedirect) {
          res.resume();
          resolve({ redirected: true, location: res.headers.location, statusCode: res.statusCode, responseTime });
        } else {
          const chunks = [];
          let size = 0;
          res.on('data', (chunk) => { chunks.push(chunk); size += chunk.length; });
          res.on('end', () => {
            const body = Buffer.concat(chunks).toString('utf8');
            resolve({
              redirected: false,
              url: finalUrl,
              statusCode: res.statusCode,
              statusMessage: res.statusMessage,
              headers: res.headers,
              body,
              size,
              responseTime,
            });
          });
        }
      });
      req.on('error', (err) => reject(err));
      req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')); });
    });

    if (result.redirected) {
      redirects++;
      finalUrl = new URL(result.location, url.href).href;
      url = new URL(finalUrl);
    } else {
      return result;
    }
  }
  throw new Error(`Too many redirects (${maxRedirects})`);
}
