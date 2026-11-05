import { URL } from 'node:url';

function addIssue(issues, severity, team, title, detail, pageUrl = '') {
  issues.push({ severity, team, title, detail, pageUrl });
}

function addPass(passed, title) {
  passed.push(title);
}

// ─────────────────────────────────────────────
// SEO AUDITS
// ─────────────────────────────────────────────
export function auditSeo(parsed, browserData, urlStr) {
  const issues = [];
  const passed = [];

  if (!parsed.title) addIssue(issues, 'high', 'seo', 'Missing <title> tag', 'Every page needs a unique, descriptive title.', urlStr);
  else if (parsed.titleLength > 60) addIssue(issues, 'low', 'seo', `Title too long (${parsed.titleLength} chars)`, 'Keep titles under 60 characters for optimal SERP display.', urlStr);
  else if (parsed.titleLength < 10) addIssue(issues, 'low', 'seo', `Title too short (${parsed.titleLength} chars)`, 'Titles should be descriptive (10-60 characters).', urlStr);
  else addPass(passed, 'Title length is good');

  if (!parsed.metaDescription) addIssue(issues, 'medium', 'seo', 'Missing meta description', 'Meta descriptions appear in search results and influence CTR.', urlStr);
  else if (parsed.metaDescription.length < 50) addIssue(issues, 'low', 'seo', `Meta description too short (${parsed.metaDescription.length} chars)`, 'Aim for 120-160 characters for rich search snippets.', urlStr);
  else addPass(passed, 'Meta description present');

  if (!parsed.canonical) addIssue(issues, 'medium', 'seo', 'Missing canonical URL', 'Canonical tags prevent duplicate content issues across pages.', urlStr);
  else addPass(passed, 'Canonical URL set');

  if (!parsed.metaViewport) addIssue(issues, 'high', 'seo', 'Missing viewport meta tag', 'Mobile-responsive pages require the viewport meta tag.', urlStr);
  else addPass(passed, 'Viewport meta tag present');

  if (parsed.metaRobots && parsed.metaRobots.includes('noindex')) addIssue(issues, 'high', 'seo', 'Page is set to noindex', 'This page will not appear in search results.', urlStr);

  if (parsed.hreflangs.length > 0) addPass(passed, `hreflang tags present (${parsed.hreflangs.length} languages)`);
  else addIssue(issues, 'low', 'seo', 'No hreflang tags', 'If this site serves multiple languages/regions, add hreflang annotations.', urlStr);

  const ogRequired = ['title', 'description', 'image'];
  const missingOg = ogRequired.filter(k => !parsed.ogTags[k]);
  if (missingOg.length > 0) addIssue(issues, 'medium', 'seo', `Missing Open Graph tags: ${missingOg.join(', ')}`, 'OG tags control how links appear on Facebook, LinkedIn, Discord, etc.', urlStr);
  else addPass(passed, 'Open Graph tags complete');

  const twitterRequired = ['card', 'title'];
  const missingTwitter = twitterRequired.filter(k => !parsed.twitterTags[k]);
  if (missingTwitter.length > 0) addIssue(issues, 'low', 'seo', `Missing Twitter Card tags: ${missingTwitter.join(', ')}`, 'Twitter Cards control how links appear on X/Twitter.', urlStr);
  else addPass(passed, 'Twitter Card tags present');

  return { issues, passed };
}

// ─────────────────────────────────────────────
// UX / ACCESSIBILITY AUDITS
// ─────────────────────────────────────────────
export function auditUx(parsed, browserData, urlStr) {
  const issues = [];
  const passed = [];

  // --- Heading structure ---
  if (parsed.headings.length === 0) addIssue(issues, 'high', 'design', 'No headings found on page', 'Headings (h1-h6) structure content for users and screen readers.', urlStr);
  else {
    if (parsed.h1Count === 0) addIssue(issues, 'high', 'design', 'Missing H1 heading', 'Every page needs exactly one H1 that describes the page content.', urlStr);
    else if (parsed.h1Count > 1) addIssue(issues, 'medium', 'design', `Multiple H1 headings (${parsed.h1Count})`, 'Use only one H1 per page for proper content hierarchy.', urlStr);
    else addPass(passed, 'Single H1 heading found');

    // Check heading order (no skipping levels)
    for (let i = 1; i < parsed.headings.length; i++) {
      const diff = parsed.headings[i].level - parsed.headings[i - 1].level;
      if (diff > 1) {
        addIssue(issues, 'medium', 'design', `Heading level skipped: ${parsed.headings[i-1].tag} → ${parsed.headings[i].tag}`, `"${parsed.headings[i-1].text.slice(0,40)}" jumps to ${parsed.headings[i].tag}. Use proper hierarchy (h1→h2→h3).`, urlStr);
        break;
      }
    }

    // Heading text quality
    const shortHeadings = parsed.headings.filter(h => h.length < 4);
    if (shortHeadings.length > 0) addIssue(issues, 'low', 'design', `Short/non-descriptive headings: ${shortHeadings.length}`, 'Headings should be descriptive (4+ chars).', urlStr);
  }

  // --- Images ---
  if (parsed.imgWithoutAlt.length > 0) addIssue(issues, 'high', 'design', `Images missing alt text: ${parsed.imgWithoutAlt.length}`, 'Alt text is essential for accessibility and SEO. Screen readers rely on it.', urlStr);
  else if (parsed.images.length > 0) addPass(passed, 'All images have alt text');

  if (parsed.imgWithoutDimensions.length > 0) addIssue(issues, 'medium', 'design', `Images missing dimensions: ${parsed.imgWithoutDimensions.length}`, 'Missing width/height causes Cumulative Layout Shift (CLS).', urlStr);

  const lazyImages = parsed.images.filter(i => i.loading === 'lazy');
  if (lazyImages.length > 0) addPass(passed, `Lazy loading on ${lazyImages.length} images`);
  else if (parsed.images.length > 3) addIssue(issues, 'low', 'design', 'No lazy loading on images', 'Add loading="lazy" to below-the-fold images for faster initial load.', urlStr);

  // --- Links ---
  if (parsed.genericLinks.length > 0) addIssue(issues, 'medium', 'design', `Generic link text: ${parsed.genericLinks.length} links`, 'Links like "click here", "read more" hurt accessibility and SEO. Use descriptive text.', urlStr);

  if (parsed.targetBlankNoopener.length > 0) addIssue(issues, 'high', 'security', `target="_blank" without rel="noopener": ${parsed.targetBlankNoopener.length} links`, 'This creates a security vulnerability (reverse tabnapping) and performance issue.', urlStr);

  if (parsed.externalLinks.length === 0 && parsed.links.length > 0) addIssue(issues, 'low', 'seo', 'No external outbound links', 'Outbound links to authoritative sources can improve SEO trust signals.', urlStr);

  // --- Language ---
  if (!parsed.lang) addIssue(issues, 'high', 'design', 'Missing lang attribute on <html>', 'The lang attribute is critical for screen readers and search engines.', urlStr);
  else addPass(passed, `Language declared: ${parsed.lang}`);

  // --- Forms ---
  if (parsed.forms.length > 0) {
    const formsWithoutLabels = parsed.forms.filter(f => !f.allInputsHaveLabels);
    if (formsWithoutLabels.length > 0) addIssue(issues, 'high', 'design', `Form inputs missing labels: ${formsWithoutLabels.length} forms`, 'Every input needs an associated <label> for accessibility.', urlStr);
    const formsWithoutSubmit = parsed.forms.filter(f => !f.hasSubmitButton);
    if (formsWithoutSubmit.length > 0) addIssue(issues, 'medium', 'design', `Forms missing submit button: ${formsWithoutSubmit.length}`, 'Forms need a visible submit button or <button type="submit">.', urlStr);
    addPass(passed, `Form count: ${parsed.forms.length}`);
  }

  // --- Buttons ---
  if (parsed.emptyButtons.length > 0) addIssue(issues, 'high', 'design', `Empty/unlabeled buttons: ${parsed.emptyButtons.length}`, 'Buttons without text fail accessibility checks. Icon buttons need aria-label.', urlStr);

  // --- ARIA ---
  if (parsed.ariaRoles.length > 0) addPass(passed, `ARIA roles used: ${parsed.ariaRoles.length}`);
  else if (parsed.links.length > 5 || parsed.buttons.length > 3) addIssue(issues, 'low', 'design', 'No ARIA roles detected', 'Interactive elements may need ARIA roles for screen reader support.', urlStr);

  if (parsed.tabIndexUsage > 10) addIssue(issues, 'low', 'design', `Excessive tabindex usage (${parsed.tabIndexUsage})`, 'Positive tabindex values can create confusing focus order.', urlStr);

  // --- Iframes ---
  if (parsed.iframesWithoutTitle.length > 0) addIssue(issues, 'medium', 'design', `iframes missing titles: ${parsed.iframesWithoutTitle.length}`, 'iframes need title attributes for accessibility.', urlStr);

  // --- Fonts ---
  if (parsed.fontLinks.length > 0) {
    const google = parsed.fontLinks.filter(f => f.provider === 'Google Fonts');
    if (google.length > 0) addIssue(issues, 'low', 'design', 'Google Fonts detected', 'Google Fonts add extra requests and can cause FOIT (Flash of Invisible Text). Self-host if possible.', urlStr);
  }

  // --- Content length ---
  if (parsed.textLength < 200 && parsed.links.length < 5) addIssue(issues, 'medium', 'design', `Thin content (${parsed.textLength} chars)`, 'Pages with very little content may be seen as low-quality by search engines.', urlStr);

  // --- Comments leaking info ---
  if (parsed.commentsWithInfo.length > 0) addIssue(issues, 'low', 'design', `HTML comments with TODOs/FIXMEs: ${parsed.commentsWithInfo.length}`, 'Development notes in HTML comments can leak internal information.', urlStr);

  // --- Console errors (from browser) ---
  if (browserData && browserData.console && browserData.console.errors.length > 0) {
    addIssue(issues, 'medium', 'dev', `Browser console errors: ${browserData.console.errors.length}`, `First error: ${browserData.console.errors[0].slice(0, 100)}`, urlStr);
  }

  return { issues, passed };
}

// ─────────────────────────────────────────────
// PERFORMANCE AUDITS
// ─────────────────────────────────────────────
export function auditPerformance(response, parsed, browserData, urlStr) {
  const issues = [];
  const passed = [];
  const sizeKB = Math.round(response.size / 1024);

  // --- Server response ---
  if (response.responseTime > 3000) addIssue(issues, 'high', 'dev', `Slow server response: ${response.responseTime}ms`, 'TTFB over 3s is poor. Optimize server, use CDN, caching.', urlStr);
  else if (response.responseTime > 1000) addIssue(issues, 'medium', 'dev', `Moderate response time: ${response.responseTime}ms`, 'Aim for TTFB under 500ms.', urlStr);
  else if (response.responseTime > 500) addIssue(issues, 'low', 'dev', `Response time: ${response.responseTime}ms`, 'Target under 500ms for first-byte response.', urlStr);
  else addPass(passed, `Fast TTFB: ${response.responseTime}ms`);

  // --- Page size ---
  if (sizeKB > 2000) addIssue(issues, 'high', 'dev', `Large page: ${sizeKB}KB`, 'Pages over 2MB are slow. Compress images, minify code, lazy load.', urlStr);
  else if (sizeKB > 500) addIssue(issues, 'medium', 'dev', `Page size: ${sizeKB}KB`, 'Aim for under 500KB. Enable compression and optimize assets.', urlStr);
  else if (sizeKB > 200) addIssue(issues, 'low', 'dev', `Page size: ${sizeKB}KB`, 'Could be leaner. Target under 200KB for fast mobile loads.', urlStr);
  else addPass(passed, `Good page size: ${sizeKB}KB`);

  // --- Compression ---
  if (response.headers['content-encoding']) addPass(passed, `Compression: ${response.headers['content-encoding']}`);
  else addIssue(issues, 'high', 'dev', 'No compression enabled', 'Enable gzip/brotli compression. Reduces transfer size by 60-80%.', urlStr);

  // --- Caching ---
  const cacheControl = response.headers['cache-control'] || '';
  if (cacheControl.includes('max-age')) {
    const match = cacheControl.match(/max-age=(\d+)/);
    if (match) {
      const secs = parseInt(match[1]);
      if (secs >= 86400) addPass(passed, `Cache TTL: ${Math.round(secs/3600)}h`);
      else if (secs > 0) addIssue(issues, 'low', 'dev', `Short cache TTL: ${secs}s`, 'Consider longer cache durations for static assets.', urlStr);
      else addIssue(issues, 'medium', 'dev', 'Cache disabled (max-age=0)', 'Static assets should be cached for repeat visits.', urlStr);
    }
  } else if (response.headers['expires']) addPass(passed, `Expires header set: ${response.headers['expires']}`);
  else addIssue(issues, 'medium', 'dev', 'No caching headers', 'Add Cache-Control headers for static resources to improve repeat load speed.', urlStr);

  // --- Resource hints ---
  if (parsed.resourceHints.preconnect.length > 0) addPass(passed, `Preconnect hints: ${parsed.resourceHints.preconnect.length}`);
  if (parsed.resourceHints.preload.length > 0) addPass(passed, `Preload hints: ${parsed.resourceHints.preload.length}`);
  if (parsed.resourceHints.prefetch.length > 0) addPass(passed, `Prefetch hints: ${parsed.resourceHints.prefetch.length}`);
  if (parsed.resourceHints.preconnect.length === 0 && parsed.thirdPartyDomains.length > 0) {
    addIssue(issues, 'low', 'dev', 'No preconnect for third-party origins', `Add <link rel="preconnect"> for ${parsed.thirdPartyDomains.slice(0, 3).join(', ')} to speed up connections.`, urlStr);
  }

  // --- Scripts ---
  const blockingScripts = parsed.scripts.filter(s => !s.async && !s.defer);
  if (blockingScripts.length > 5) addIssue(issues, 'medium', 'dev', `Render-blocking scripts: ${blockingScripts.length}`, 'Blocking scripts delay page rendering. Use async/defer.', urlStr);
  else if (blockingScripts.length > 0) addIssue(issues, 'low', 'dev', `Render-blocking scripts: ${blockingScripts.length}`, 'Consider async/defer for non-critical scripts.', urlStr);
  else addPass(passed, 'No render-blocking scripts');

  if (parsed.scripts.length > 15) addIssue(issues, 'medium', 'dev', `Excessive scripts: ${parsed.scripts.length}`, 'Too many script files increase request overhead. Bundle when possible.', urlStr);
  else addPass(passed, `Scripts: ${parsed.scripts.length}`);

  // --- Stylesheets ---
  if (parsed.stylesheets.length > 4) addIssue(issues, 'low', 'dev', `Multiple stylesheets: ${parsed.stylesheets.length}`, 'Consolidate CSS files to reduce requests.', urlStr);

  if (parsed.inlineStyleCount > 10) addIssue(issues, 'low', 'dev', `Many inline <style> blocks: ${parsed.inlineStyleCount}`, 'Large inline styles bloat HTML. Extract to external CSS when possible.', urlStr);

  // --- Third-party ---
  if (parsed.thirdPartyDomains.length > 5) addIssue(issues, 'medium', 'dev', `Third-party domains: ${parsed.thirdPartyDomains.length}`, 'Each third-party domain adds DNS, TCP, and SSL overhead. Audit whether all are needed.', urlStr);
    else if (parsed.thirdPartyDomains.length > 0) addPass(passed, `Third-party origins: ${parsed.thirdPartyDomains.length}`);

  // --- Browser metrics ---
  if (browserData && browserData.metrics) {
    const m = browserData.metrics;
    if (m.lcp > 4000) addIssue(issues, 'high', 'dev', `LCP: ${(m.lcp/1000).toFixed(1)}s`, 'Largest Contentful Paint should be under 2.5s. Optimize hero images and fonts.', urlStr);
    else if (m.lcp > 2500) addIssue(issues, 'medium', 'dev', `LCP: ${(m.lcp/1000).toFixed(1)}s`, 'LCP target is under 2.5s. Consider optimizing LCP element.', urlStr);
    else if (m.lcp > 0) addPass(passed, `Good LCP: ${(m.lcp/1000).toFixed(1)}s`);

    if (m.cls > 0.25) addIssue(issues, 'high', 'dev', `CLS: ${m.cls.toFixed(3)}`, 'Cumulative Layout Shift should be under 0.1. Set image dimensions, avoid late-inserting content.', urlStr);
    else if (m.cls > 0.1) addIssue(issues, 'medium', 'dev', `CLS: ${m.cls.toFixed(3)}`, 'CLS target is under 0.1. Check for layout shifts without dimensions.', urlStr);
    else if (m.cls > 0) addPass(passed, `Good CLS: ${m.cls.toFixed(3)}`);

    if (m.fcp > 3000) addIssue(issues, 'medium', 'dev', `FCP: ${(m.fcp/1000).toFixed(1)}s`, 'First Contentful Paint should be under 1.8s.', urlStr);
    else if (m.fcp > 0) addPass(passed, `Good FCP: ${(m.fcp/1000).toFixed(1)}s`);

    if (m.domNodes > 2000) addIssue(issues, 'medium', 'dev', `Large DOM: ${m.domNodes} nodes`, 'DOM trees over 1500 nodes slow down rendering and memory usage.', urlStr);
    else if (m.domNodes > 1000) addIssue(issues, 'low', 'dev', `DOM size: ${m.domNodes} nodes`, 'Consider reducing DOM complexity for better performance.', urlStr);
    else addPass(passed, `DOM size: ${m.domNodes} nodes`);
  }

  return { issues, passed };
}

// ─────────────────────────────────────────────
// SECURITY AUDITS
// ─────────────────────────────────────────────
export function auditSecurity(response, parsed, browserData, urlStr) {
  const issues = [];
  const passed = [];
  const headers = response.headers;
  const url = new URL(urlStr);

  // --- HTTPS ---
  if (url.protocol !== 'https:') addIssue(issues, 'high', 'security', 'Not using HTTPS', 'All sites must use HTTPS. HTTP transmits data in plaintext.', urlStr);
  else addPass(passed, 'HTTPS enabled');

  // --- HSTS ---
  const hsts = headers['strict-transport-security'];
  if (hsts) {
    const match = hsts.match(/max-age=(\d+)/);
    if (match && parseInt(match[1]) >= 31536000) addPass(passed, 'HSTS with long max-age');
    else addIssue(issues, 'medium', 'security', 'HSTS max-age too short', 'Set HSTS max-age to at least 1 year (31536000s).', urlStr);
  } else addIssue(issues, 'medium', 'security', 'Missing HSTS header', 'Strict-Transport-Security tells browsers to always use HTTPS.', urlStr);

  // --- CSP ---
  if (headers['content-security-policy']) addPass(passed, 'CSP header present');
  else addIssue(issues, 'high', 'security', 'Missing Content-Security-Policy', 'CSP is your primary defense against XSS and data injection attacks.', urlStr);

  // --- X-Content-Type-Options ---
  if (headers['x-content-type-options'] === 'nosniff') addPass(passed, 'X-Content-Type-Options: nosniff');
  else addIssue(issues, 'medium', 'security', 'Missing X-Content-Type-Options', 'Prevents MIME sniffing attacks. Set: X-Content-Type-Options: nosniff', urlStr);

  // --- X-Frame-Options ---
  if (headers['x-frame-options']) addPass(passed, 'X-Frame-Options set');
  else addIssue(issues, 'medium', 'security', 'Missing X-Frame-Options', 'Prevents clickjacking. Set DENY or SAMEORIGIN.', urlStr);

  // --- Referrer-Policy ---
  if (headers['referrer-policy']) addPass(passed, 'Referrer-Policy set');
  else addIssue(issues, 'low', 'security', 'Missing Referrer-Policy', 'Controls referrer info leakage. Recommended: strict-origin-when-cross-origin', urlStr);

  // --- Permissions-Policy ---
  if (headers['permissions-policy'] || headers['feature-policy']) addPass(passed, 'Permissions-Policy set');
  else addIssue(issues, 'low', 'security', 'Missing Permissions-Policy', 'Restricts which browser APIs (camera, mic, etc.) the site can use.', urlStr);

  // --- Server info disclosure ---
  if (headers['server']) addIssue(issues, 'low', 'security', `Server header exposed: "${headers['server']}"`, 'Reveals server software. Remove or obfuscate in production.', urlStr);

  // --- X-Powered-By ---
  if (headers['x-powered-by']) addIssue(issues, 'low', 'security', `X-Powered-By exposed: "${headers['x-powered-by']}"`, 'Technology stack info helps attackers. Remove this header.', urlStr);

  // --- Cookies ---
  if (headers['set-cookie']) {
    const cookies = Array.isArray(headers['set-cookie']) ? headers['set-cookie'] : [headers['set-cookie']];
    for (const cookie of cookies) {
      const name = cookie.split('=')[0];
      if (!cookie.includes('HttpOnly')) addIssue(issues, 'high', 'security', `Cookie "${name}" missing HttpOnly`, 'HttpOnly prevents JavaScript access, mitigating XSS data theft.', urlStr);
      if (!cookie.includes('Secure')) addIssue(issues, 'high', 'security', `Cookie "${name}" missing Secure`, 'Secure flag ensures cookie is only sent over HTTPS.', urlStr);
      if (!cookie.includes('SameSite')) addIssue(issues, 'medium', 'security', `Cookie "${name}" missing SameSite`, 'SameSite=Lax prevents CSRF attacks. Recommended.', urlStr);
    }
  }

  // --- SRI ---
  if (parsed.scriptsWithoutSRI && parsed.scriptsWithoutSRI.length > 0) {
    addIssue(issues, 'medium', 'security', `Scripts without SRI: ${parsed.scriptsWithoutSRI.length}`, 'Subresource Integrity ensures CDN scripts haven\'t been tampered with.', urlStr);
  }

  // --- target="_blank" (already in UX but relevant for security) ---
  if (parsed.targetBlankNoopener && parsed.targetBlankNoopener.length > 0) {
    addIssue(issues, 'medium', 'security', `Reverse tabnapping risk: ${parsed.targetBlankNoopener.length} links`, 'target="_blank" without rel="noopener" lets the new page control the previous tab via window.opener.', urlStr);
  }

  // --- Inline event handlers ---
  if (parsed.inlineEventHandlers && parsed.inlineEventHandlers.length > 0) {
    addIssue(issues, 'low', 'security', `Inline event handlers: ${parsed.inlineEventHandlers.length}`, 'Inline onclick/onload handlers increase XSS surface. Use addEventListener() instead.', urlStr);
  }

  // --- Emails exposed ---
  if (parsed.emails && parsed.emails.length > 0) {
    addIssue(issues, 'low', 'security', `Emails exposed in HTML: ${parsed.emails.length}`, 'Email addresses in page source get harvested by spambots. Obfuscate or use contact forms.', urlStr);
  }

  // --- Content type ---
  const ct = headers['content-type'] || '';
  if (ct && !ct.includes('charset')) addIssue(issues, 'low', 'security', 'Content-Type missing charset', 'Specifying charset (e.g. charset=utf-8) prevents XSS via charset confusion.', urlStr);

  return { issues, passed };
}

// ─────────────────────────────────────────────
// DUPLICATE CONTENT AUDITS
// ─────────────────────────────────────────────
export function auditDuplicates(parsed, browserData, urlStr) {
  const issues = [];
  const passed = [];

  if (parsed.duplicateIds && parsed.duplicateIds.length > 0) {
    addIssue(issues, 'high', 'dev', `Duplicate IDs: ${parsed.duplicateIds.length}`, `IDs: ${parsed.duplicateIds.slice(0, 5).map(d => `#${d.id} (×${d.count})`).join(', ')}${parsed.duplicateIds.length > 5 ? '...' : ''}`, urlStr);
  }

  if (parsed.duplicateMetaNames && parsed.duplicateMetaNames.length > 0) {
    const names = parsed.duplicateMetaNames.map(d => `${d.name} (×${d.count})`);
    addIssue(issues, 'medium', 'seo', `Duplicate meta tags: ${parsed.duplicateMetaNames.length}`, `Duplicate meta: ${names.join(', ')}. Only one of each meta tag should exist.`, urlStr);
  }

  return { issues, passed };
}
