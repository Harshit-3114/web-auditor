import { URL } from 'node:url';

export function checkSecurity(response, parsed, urlStr) {
  const issues = [];
  const passed = [];
  const headers = response.headers;
  const url = new URL(urlStr);

  const addIssue = (severity, category, title, detail) => issues.push({ severity, category, title, detail });
  const addPass = (title) => passed.push(title);

  // --- HTTPS ---
  if (url.protocol !== 'https:') {
    addIssue('high', 'encryption', 'Site not served over HTTPS', 'HTTP transmits data in plaintext. All traffic should use TLS encryption.');
  } else {
    addPass('Connection uses HTTPS');
  }

  // --- Security Headers ---

  // Strict-Transport-Security
  if (headers['strict-transport-security']) {
    const hsts = headers['strict-transport-security'];
    if (hsts.includes('max-age=')) {
      const match = hsts.match(/max-age=(\d+)/);
      if (match && parseInt(match[1]) >= 31536000) {
        addPass('HSTS header set with long max-age');
      } else {
        addIssue('medium', 'headers', 'HSTS max-age too short', 'HSTS max-age should be at least 1 year (31536000s).');
      }
    }
  } else {
    addIssue('medium', 'headers', 'Missing Strict-Transport-Security header', 'HSTS tells browsers to always use HTTPS. Consider adding it.');
  }

  // Content-Security-Policy
  if (headers['content-security-policy']) {
    addPass('Content-Security-Policy header is set');
  } else {
    addIssue('medium', 'headers', 'Missing Content-Security-Policy header', 'CSP mitigates XSS and data injection attacks. Consider implementing it.');
  }

  // X-Content-Type-Options
  if (headers['x-content-type-options'] === 'nosniff') {
    addPass('X-Content-Type-Options: nosniff is set');
  } else {
    addIssue('low', 'headers', 'Missing X-Content-Type-Options: nosniff', 'Prevents MIME-type sniffing. Add: X-Content-Type-Options: nosniff');
  }

  // X-Frame-Options
  if (headers['x-frame-options']) {
    addPass('X-Frame-Options is set');
  } else {
    addIssue('low', 'headers', 'Missing X-Frame-Options header', 'Prevents clickjacking. Consider setting DENY or SAMEORIGIN.');
  }

  // Referrer-Policy
  if (headers['referrer-policy']) {
    addPass('Referrer-Policy header is set');
  } else {
    addIssue('low', 'headers', 'Missing Referrer-Policy header', 'Controls how much referrer info is sent with requests.');
  }

  // Permissions-Policy
  if (headers['permissions-policy'] || headers['feature-policy']) {
    addPass('Permissions-Policy / Feature-Policy is set');
  } else {
    addIssue('low', 'headers', 'Missing Permissions-Policy header', 'Restricts which browser APIs the site can use.');
  }

  // Server header (information disclosure)
  if (headers['server']) {
    addIssue('low', 'headers', `Server header exposed: "${headers['server']}"`, 'Server header can reveal software versions to attackers. Consider removing or obfuscating it.');
  }

  // --- Cookie security ---
  if (headers['set-cookie']) {
    const cookies = Array.isArray(headers['set-cookie']) ? headers['set-cookie'] : [headers['set-cookie']];
    for (const cookie of cookies) {
      if (!cookie.includes('HttpOnly')) {
        addIssue('medium', 'cookies', 'Cookie missing HttpOnly flag', `Cookie "${cookie.split('=')[0]}" is accessible via JavaScript, increasing XSS risk.`);
      }
      if (!cookie.includes('Secure')) {
        addIssue('medium', 'cookies', 'Cookie missing Secure flag', `Cookie "${cookie.split('=')[0]}" can be sent over unencrypted HTTP.`);
      }
      if (!cookie.includes('SameSite')) {
        addIssue('low', 'cookies', 'Cookie missing SameSite attribute', `Cookie "${cookie.split('=')[0]}" lacks SameSite, which helps prevent CSRF.`);
      }
    }
  }

  // --- Forms security ---
  if (parsed.forms && parsed.forms.length > 0) {
    for (const form of parsed.forms) {
      if (form.method === 'get' && form.inputs > 0) {
        addIssue('low', 'forms', 'Form uses GET method with input fields', `Form action="${form.action}" sends data via URL. Use POST for data mutation.`);
      }
      if (form.action && !form.action.startsWith('https') && form.action !== '' && !form.action.startsWith('/')) {
        addIssue('medium', 'forms', 'Form submits over insecure connection', `Form action "${form.action}" is not HTTPS.`);
      }
      if (!form.hasCsrf && form.method === 'post') {
        addIssue('medium', 'forms', 'POST form missing CSRF protection', `Form action="${form.action}" has no visible CSRF token.`);
      }
    }
    if (parsed.forms.every(f => f.hasCsrf || f.method !== 'post')) {
      addPass('Forms appear to have CSRF protection');
    }
  }

  // --- Exposed emails ---
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emails = parsed.rawBody.match(emailRegex);
  if (emails) {
    const unique = [...new Set(emails)];
    addIssue('low', 'info-disclosure', `Email addresses found in page (${unique.length})`, `Emails exposed: ${unique.slice(0, 5).join(', ')}${unique.length > 5 ? '...' : ''}`);
  }

  // --- Inline scripts (XSS risk indicator) ---
  const inlineScripts = parsed.rawBody.match(/<script\b(?![\s\S]*?src=)[\s\S]*?>/gi);
  if (inlineScripts && inlineScripts.length > 5) {
    addIssue('low', 'xss-risk', `Large number of inline scripts (${inlineScripts.length})`, 'Excessive inline scripts increase XSS surface. Consider using CSP + external files.');
  }

  return { issues, passed };
}
