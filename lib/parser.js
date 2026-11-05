import * as cheerio from 'cheerio';

export function parseHtml(body, baseUrl) {
  const $ = cheerio.load(body);
  const base = $('base').attr('href') || baseUrl;
  const resolveUrl = (u) => { try { return new URL(u, base).href; } catch { return u; } };
  const isExternal = (href) => { try { return new URL(href, base).hostname !== new URL(baseUrl).hostname; } catch { return false; } };

  // --- Language & encoding ---
  const lang = $('html').attr('lang') || $('html').attr('xml:lang') || '';
  const charset = $('meta[charset]').attr('charset') || $('meta[http-equiv="Content-Type"]').attr('content') || '';
  const hasDoctype = /^<!DOCTYPE\s/i.test(body.trim());

  // --- All meta tags ---
  const metaTags = {};
  $('meta').each((_, el) => {
    const name = $(el).attr('name') || '';
    const prop = $(el).attr('property') || '';
    const httpEquiv = $(el).attr('http-equiv') || '';
    const content = $(el).attr('content') || '';
    const key = name || prop || httpEquiv;
    if (key) {
      if (!metaTags[key]) metaTags[key] = [];
      metaTags[key].push(content);
    }
  });

  // --- SEO meta ---
  const title = $('title').text().trim();
  const titleLength = [...title].length;
  const metaDescription = (metaTags['description'] || [''])[0];
  const metaViewport = !!metaTags['viewport'];
  const metaRobots = (metaTags['robots'] || [''])[0];
  const metaKeywords = (metaTags['keywords'] || [''])[0];

  // --- Open Graph ---
  const ogTags = {};
  for (const [k, v] of Object.entries(metaTags)) {
    if (k.startsWith('og:')) ogTags[k.slice(3)] = v[0];
  }

  // --- Twitter Card ---
  const twitterTags = {};
  for (const [k, v] of Object.entries(metaTags)) {
    if (k.startsWith('twitter:')) twitterTags[k.slice(8)] = v[0];
  }

  // --- Canonical & hreflang ---
  const canonical = $('link[rel="canonical"]').attr('href') || '';
  const hreflangs = [];
  $('link[rel="alternate"][hreflang]').each((_, el) => {
    hreflangs.push({ hreflang: $(el).attr('hreflang'), href: resolveUrl($(el).attr('href')) });
  });

  // --- Headings ---
  const headings = [];
  $('h1, h2, h3, h4, h5, h6').each((_, el) => {
    const tag = el.tagName.toLowerCase();
    const text = $(el).text().trim();
    if (text) headings.push({ level: parseInt(tag[1]), tag, text, length: text.length });
  });
  const headingOutline = headings.map(h => `${'  '.repeat(h.level - 1)}${h.tag}: ${h.text.slice(0, 60)}`).join('\n');

  // --- Links ---
  const links = [];
  const genericTexts = ['click here', 'here', 'read more', 'more', 'learn more', 'this', 'link', 'go', 'details', 'view'];
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    const text = $(el).text().trim();
    if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
      links.push({
        href: resolveUrl(href),
        text: text || '(image/icon link)',
        isExternal: isExternal(href),
        hasRelNoopener: ($(el).attr('rel') || '').includes('noopener'),
        target: $(el).attr('target') || '',
        hasGenericText: genericTexts.includes(text.toLowerCase()),
        isNofollow: ($(el).attr('rel') || '').includes('nofollow'),
      });
    }
  });
  const externalLinks = links.filter(l => l.isExternal);
  const internalLinks = links.filter(l => !l.isExternal);

  // --- target="_blank" without noopener ---
  const targetBlankNoopener = links.filter(l => l.target === '_blank' && !l.hasRelNoopener);

  // --- Generic text links ---
  const genericLinks = links.filter(l => l.hasGenericText);

  // --- Images ---
  const images = [];
  $('img').each((_, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src') || '';
    images.push({
      src: src ? resolveUrl(src) : '',
      alt: $(el).attr('alt') || '',
      width: $(el).attr('width'),
      height: $(el).attr('height'),
      loading: $(el).attr('loading') || '',
      lazy: !!$(el).attr('loading'),
    });
  });
  const imgWithoutAlt = images.filter(i => !i.alt);
  const imgWithoutDimensions = images.filter(i => !i.width || !i.height);

  // --- Scripts ---
  const scripts = [];
  let inlineScriptCount = 0;
  $('script').each((_, el) => {
    const src = $(el).attr('src');
    if (src) {
      scripts.push({
        src: resolveUrl(src),
        type: $(el).attr('type') || 'text/javascript',
        async: !!$(el).attr('async'),
        defer: !!$(el).attr('defer'),
        integrity: $(el).attr('integrity') || '',
        isInline: false,
        isExternal: isExternal(src),
      });
    } else {
      inlineScriptCount++;
    }
  });
  const scriptsWithoutSRI = scripts.filter(s => !s.integrity && s.isExternal);

  // --- Stylesheets ---
  const stylesheets = [];
  $('link[rel="stylesheet"]').each((_, el) => {
    stylesheets.push({
      href: resolveUrl($(el).attr('href')),
      media: $(el).attr('media') || 'all',
      integrity: $(el).attr('integrity') || '',
    });
  });
  const inlineStyleCount = $('style').length;

  // --- Resource hints ---
  const resourceHints = { preload: [], prefetch: [], preconnect: [], dnsPrefetch: [] };
  $('link[rel]').each((_, el) => {
    const rel = $(el).attr('rel');
    const href = $(el).attr('href');
    if (rel === 'preload' && href) resourceHints.preload.push(href);
    if (rel === 'prefetch' && href) resourceHints.prefetch.push(href);
    if (rel === 'preconnect') resourceHints.preconnect.push($(el).attr('href') || '');
    if (rel === 'dns-prefetch') resourceHints.dnsPrefetch.push($(el).attr('href') || '');
  });

  // --- Forms ---
  const forms = [];
  $('form').each((_, el) => {
    const inputs = [];
    $(el).find('input, textarea, select').each((_, inp) => {
      const id = $(inp).attr('id');
      const name = $(inp).attr('name');
      const type = $(inp).attr('type') || 'text';
      const hasLabel = id ? $(`label[for="${id}"]`).length > 0 || $(inp).closest('label').length > 0 : false;
      inputs.push({ type: ['submit', 'button', 'hidden'].includes(type) ? type : 'data', name: name || '', hasLabel });
    });
    forms.push({
      action: $(el).attr('action') || '',
      method: ($(el).attr('method') || 'get').toLowerCase(),
      inputCount: inputs.length,
      dataInputCount: inputs.filter(i => i.type === 'data').length,
      hasCsrf: $(el).find('input[name*="csrf" i], input[name*="token" i], input[name*="_token" i]').length > 0,
      allInputsHaveLabels: inputs.filter(i => i.type === 'data').every(i => i.hasLabel),
      hasSubmitButton: $(el).find('button[type="submit"], input[type="submit"]').length > 0,
    });
  });

  // --- Buttons ---
  const buttons = [];
  $('button, input[type="submit"], input[type="button"], a[role="button"]').each((_, el) => {
    const tag = el.tagName.toLowerCase();
    let text = '';
    if (tag === 'button') text = $(el).text().trim();
    else if (tag === 'input') text = $(el).attr('value') || '';
    else text = $(el).text().trim();
    buttons.push({ tag, text: text || '(empty)', type: $(el).attr('type') || '' });
  });
  const emptyButtons = buttons.filter(b => b.text === '(empty)' || !b.text);

  // --- ARIA ---
  const ariaRoles = [];
  $('[role]').each((_, el) => {
    ariaRoles.push({ role: $(el).attr('role'), tag: el.tagName.toLowerCase() });
  });
  const ariaLabels = [];
  $('[aria-label], [aria-labelledby]').each((_, el) => {
    const label = $(el).attr('aria-label') || $(el).attr('aria-labelledby') || '';
    ariaLabels.push({ tag: el.tagName.toLowerCase(), label: label.slice(0, 80) });
  });
  const tabIndexUsage = $('[tabindex]').length;
  const ariaHiddenCount = $('[aria-hidden="true"]').length;

  // --- Inline event handlers (XSS risk) ---
  const inlineEventHandlerCount = 0;
  const inlineEventHandlers = [];
  $('[onclick], [onload], [onchange], [onsubmit], [onerror], [onfocus], [onblur], [onmouseover], [oninput]').each((_, el) => {
    const attrs = el.attribs;
    for (const [attr, val] of Object.entries(attrs)) {
      if (attr.startsWith('on') && val) {
        inlineEventHandlers.push({ event: attr, snippet: val.slice(0, 80) });
      }
    }
  });

  // --- Duplicate IDs ---
  const idCounts = {};
  $('[id]').each((_, el) => {
    const id = $(el).attr('id');
    if (id) idCounts[id] = (idCounts[id] || 0) + 1;
  });
  const duplicateIds = Object.entries(idCounts).filter(([, c]) => c > 1).map(([id, count]) => ({ id, count }));

  // --- Duplicate meta names ---
  const duplicateMetaNames = Object.entries(metaTags).filter(([, v]) => v.length > 1).map(([name, values]) => ({ name, count: values.length }));

  // --- Multiple H1 check ---
  const h1Count = headings.filter(h => h.level === 1).length;

  // --- Iframes ---
  const iframes = [];
  $('iframe').each((_, el) => {
    iframes.push({ src: $(el).attr('src') || '', title: $(el).attr('title') || '' });
  });
  const iframesWithoutTitle = iframes.filter(i => !i.title);

  // --- Video / Audio ---
  const videoCount = $('video').length;
  const audioCount = $('audio').length;

  // --- Comments ---
  const comments = [];
  const commentRegex = /<!--([\s\S]*?)-->/g;
  let cm;
  while ((cm = commentRegex.exec(body)) !== null) {
    const c = cm[1].trim();
    if (c && c.length < 200) comments.push(c);
  }
  const commentsWithInfo = comments.filter(c => /todo|fixme|hack|remove|deprecated|debug|fuck|shit|password|key|secret/i.test(c));

  // --- Emails ---
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emails = [...new Set(body.match(emailRegex) || [])];

  // --- JSON-LD / Schema ---
  const jsonLdItems = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).html());
      jsonLdItems.push({ type: data['@type'] || 'unknown', keys: Object.keys(data) });
    } catch { }
  });
  // Microdata check
  const hasMicrodata = $('[itemscope], [itemtype]').length > 0;

  // --- Noscript ---
  const hasNoscript = $('noscript').length > 0;

  // --- Favicon ---
  const faviconLink = $('link[rel*="icon"]').first().attr('href') || '';
  const hasFavicon = !!faviconLink;

  // --- Third-party domains ---
  const allExternalUrls = [...scripts.filter(s => s.isExternal).map(s => s.src), ...stylesheets.map(s => s.href), ...externalLinks.map(l => l.href)];
  const thirdPartyDomains = [...new Set(allExternalUrls.map(u => { try { return new URL(u).hostname; } catch { return ''; } }).filter(h => h && h !== new URL(baseUrl).hostname))];

  // --- Font detection ---
  const fontLinks = [];
  $('link[href*="fonts"]').each((_, el) => {
    fontLinks.push({ href: $(el).attr('href'), provider: $(el).attr('href').includes('googleapis') ? 'Google Fonts' : 'custom' });
  });

  return {
    title, titleLength, lang, charset, hasDoctype, textLength: body.length, rawBody: body,
    metaViewport, metaDescription, metaRobots, metaKeywords, ogTags, twitterTags, canonical, hreflangs,
    headings, headingOutline, h1Count,
    links, externalLinks, internalLinks, targetBlankNoopener, genericLinks,
    images, imgWithoutAlt, imgWithoutDimensions,
    scripts, scriptsWithoutSRI, inlineScriptCount,
    stylesheets, inlineStyleCount,
    resourceHints,
    forms,
    buttons, emptyButtons,
    ariaRoles, ariaLabels, tabIndexUsage, ariaHiddenCount,
    inlineEventHandlers, inlineEventHandlerCount,
    duplicateIds, duplicateMetaNames,
    iframes, iframesWithoutTitle, videoCount, audioCount,
    comments, commentsWithInfo, emails,
    jsonLdItems, hasMicrodata,
    hasNoscript, hasFavicon, faviconLink,
    thirdPartyDomains, fontLinks,
  };
}
