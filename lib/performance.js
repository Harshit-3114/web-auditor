export function analyzePerformance(response, parsed) {
  const issues = [];
  const passed = [];

  // --- Response time ---
  if (response.responseTime > 2000) {
    issues.push({ severity: 'high', title: 'Slow response time', detail: `Page took ${response.responseTime}ms to respond. Aim for under 500ms.` });
  } else if (response.responseTime > 1000) {
    issues.push({ severity: 'medium', title: 'Moderate response time', detail: `Page took ${response.responseTime}ms. Aim for under 500ms.` });
  } else if (response.responseTime > 500) {
    issues.push({ severity: 'low', title: 'Response time could improve', detail: `Page took ${response.responseTime}ms. Target: <500ms.` });
  } else {
    passed.push(`Fast response time: ${response.responseTime}ms`);
  }

  // --- Page size ---
  const sizeKB = Math.round(response.size / 1024);
  if (sizeKB > 2000) {
    issues.push({ severity: 'high', title: `Large page size: ${sizeKB}KB`, detail: 'Pages over 2MB are slow to load, especially on mobile. Consider code splitting and lazy loading.' });
  } else if (sizeKB > 500) {
    issues.push({ severity: 'medium', title: `Page size: ${sizeKB}KB`, detail: 'Aim for under 500KB. Use compression, minification, and optimized images.' });
  } else if (sizeKB > 200) {
    issues.push({ severity: 'low', title: `Page size: ${sizeKB}KB`, detail: 'Reasonable but could be smaller. Target under 200KB for fast loads.' });
  } else {
    passed.push(`Good page size: ${sizeKB}KB`);
  }

  // --- Compression ---
  const encoding = response.headers['content-encoding'];
  if (encoding) {
    passed.push(`Content encoding: ${encoding}`);
  } else {
    issues.push({ severity: 'medium', title: 'No content compression detected', detail: 'Enable gzip/brotli compression to reduce transfer size by 60-80%.' });
  }

  // --- Scripts ---
  if (parsed.scripts.length > 20) {
    issues.push({ severity: 'medium', title: `High number of script resources (${parsed.scripts.length})`, detail: 'Too many scripts increase HTTP requests and block rendering. Bundle and minify.' });
  } else if (parsed.scripts.length > 10) {
    issues.push({ severity: 'low', title: `Script resources: ${parsed.scripts.length}`, detail: 'Consider reducing HTTP requests by bundling.' });
  } else {
    passed.push(`Script resources: ${parsed.scripts.length}`);
  }

  // --- Stylesheets ---
  if (parsed.stylesheets.length > 5) {
    issues.push({ severity: 'low', title: `Multiple stylesheets (${parsed.stylesheets.length})`, detail: 'Consolidate CSS files to reduce requests.' });
  } else {
    passed.push(`Stylesheets: ${parsed.stylesheets.length}`);
  }

  // --- Inline styles (render blocking) ---
  if (parsed.inlineStyles > 0) {
    issues.push({ severity: 'low', title: `Inline <style> blocks: ${parsed.inlineStyles}`, detail: 'Critical CSS should be inlined, but large inline blocks increase HTML size.' });
  }

  // --- Images ---
  const imgWithoutDimensions = parsed.images.filter(i => !i.width || !i.height);
  if (imgWithoutDimensions.length > 0) {
    issues.push({ severity: 'low', title: `Images without dimensions: ${imgWithoutDimensions.length}`, detail: 'Missing width/height attributes cause layout shifts (CLS).' });
  }

  const imgWithoutAlt = parsed.images.filter(i => !i.alt);
  if (imgWithoutAlt.length > 0) {
    issues.push({ severity: 'low', title: `Images missing alt text: ${imgWithoutAlt.length}`, detail: 'Alt text improves accessibility and SEO.' });
  }

  // --- Async/defer scripts ---
  const blockingScripts = parsed.scripts.filter(s => !s.async && !s.defer && s.type === 'text/javascript');
  if (blockingScripts.length > 3) {
    issues.push({ severity: 'medium', title: `Render-blocking scripts: ${blockingScripts.length}`, detail: `${blockingScripts.length} scripts lack async/defer. They block page rendering.` });
  } else if (blockingScripts.length > 0) {
    issues.push({ severity: 'low', title: `Render-blocking scripts: ${blockingScripts.length}`, detail: 'Consider adding async/defer to non-critical scripts.' });
  }

  // --- Title and meta ---
  if (!parsed.title) {
    issues.push({ severity: 'high', title: 'Missing <title> tag', detail: 'The page has no title, which hurts SEO and accessibility.' });
  } else {
    passed.push(`Page title: "${parsed.title.slice(0, 60)}"`);
  }

  if (!parsed.metaDescription) {
    issues.push({ severity: 'low', title: 'Missing meta description', detail: 'Meta description helps SEO and social sharing.' });
  }

  if (!parsed.metaViewport) {
    issues.push({ severity: 'high', title: 'Missing viewport meta tag', detail: 'Without viewport meta, mobile rendering is broken.' });
  }

  if (!parsed.hasFavicon) {
    issues.push({ severity: 'low', title: 'Missing favicon', detail: 'A favicon improves brand recognition in tabs.' });
  }

  return { issues, passed };
}
