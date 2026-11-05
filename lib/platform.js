const WIX_MAP = [
  // ═══════════════════════════════════════════════
  // FIXABLE VIA WIX DASHBOARD (Settings/SEO panels)
  // ═══════════════════════════════════════════════
  { match: /^title too (long|short)/i, via: 'dashboard', fixable: true, note: 'Wix Dashboard → Pages → page Settings → SEO → Title tag' },
  { match: /^meta description too short/i, via: 'dashboard', fixable: true, note: 'Wix Dashboard → Pages → page Settings → SEO → Description' },
  { match: /^missing <title> tag/i, via: 'dashboard', fixable: true, note: 'Wix Dashboard → Pages → page Settings → SEO → Title tag' },
  { match: /^missing meta description/i, via: 'dashboard', fixable: true, note: 'Wix Dashboard → Pages → page Settings → SEO → Description' },
  { match: /^missing canonical URL/i, via: 'dashboard', fixable: true, note: 'Wix Dashboard → SEO → Advanced SEO → Canonical URL' },
  { match: /^page is set to noindex/i, via: 'dashboard', fixable: true, note: 'Wix Dashboard → Pages → page Settings → SEO → Advanced → "Let search engines index this page"' },
  { match: /^no hreflang tags/i, via: 'dashboard', fixable: true, note: 'Wix Dashboard → SEO → Advanced → Hreflang tags' },
  { match: /^missing open graph tags/i, via: 'dashboard', fixable: true, note: 'Wix Dashboard → SEO → Social Share → Open Graph' },
  { match: /^missing twitter card tags/i, via: 'dashboard', fixable: true, note: 'Wix Dashboard → SEO → Social Share → Twitter Card' },
  { match: /^missing lang attribute/i, via: 'dashboard', fixable: true, note: 'Wix Dashboard → Settings → Site Languages → Set primary language' },
  { match: /^duplicate meta tags/i, via: 'dashboard', fixable: true, note: 'Wix Dashboard → SEO → Advanced → Remove duplicate meta tags' },
  { match: /^no external outbound links/i, via: 'editor', fixable: true, note: 'Wix Editor → Add links to external sites' },

  // ═══════════════════════════════════════════════
  // FIXABLE VIA WIX EDITOR (Visual Editor / UI)
  // ═══════════════════════════════════════════════
  { match: /^(no headings|missing h1|multiple h1|heading level skipped|short\/non-descriptive headings)/i, via: 'editor', fixable: true, note: 'Wix Editor → Select text → Heading dropdown (H1/H2/H3)' },
  { match: /^images missing alt text/i, via: 'editor', fixable: true, note: 'Wix Editor → Click image → Settings → "What\'s in the image?" field' },
  { match: /^images missing dimensions/i, via: 'editor', fixable: true, note: 'Wix Editor → Set explicit width/height in image properties to prevent layout shifts' },
  { match: /^no lazy loading on images/i, via: 'editor', fixable: true, note: 'Wix Editor → Image settings → Enable lazy loading (Wix may do this automatically)' },
  { match: /^generic link text/i, via: 'editor', fixable: true, note: 'Wix Editor → Click link text → Rewrite to describe the destination' },
  { match: /^target="_blank".*noopener/i, via: 'editor', fixable: true, note: 'Wix Editor → Link settings → Advanced → Check "Add rel="noopener""' },
  { match: /^form inputs missing labels/i, via: 'editor', fixable: true, note: 'Wix Editor → Form → Click field → Settings → Add visible label text' },
  { match: /^forms missing submit button/i, via: 'editor', fixable: true, note: 'Wix Editor → Add a Button element → Set type to "Submit"' },
  { match: /^empty\/unlabeled buttons/i, via: 'editor', fixable: true, note: 'Wix Editor → Icon buttons need text or → Accessibility panel → Set aria-label' },
  { match: /^no aria roles detected/i, via: 'editor', fixable: true, note: 'Wix Editor → Accessibility panel → Add ARIA roles to interactive elements' },
  { match: /^excessive tabindex usage/i, via: 'editor', fixable: true, note: 'Wix Editor → Accessibility panel → Check & reorder tab sequence' },
  { match: /^iframes missing titles/i, via: 'editor', fixable: true, note: 'Wix Editor → Embed element → Settings → Add descriptive title' },
  { match: /^google fonts detected/i, via: 'editor', fixable: true, note: 'Wix Editor → Site Design → Fonts → Choose standard/system fonts instead of Google Fonts' },
  { match: /^thin content/i, via: 'editor', fixable: true, note: 'Wix Editor → Add more content (text, images, video) to this page' },
  { match: /^(large page|page size)/i, via: 'editor', fixable: true, note: 'Wix Editor → Compress images before uploading, reduce element count, use smaller media files' },
  { match: /^dom size/i, via: 'editor', fixable: true, note: 'Wix Editor → Simplify page layout, reduce repeated elements, use fewer columns/sections' },
  { match: /^many inline <style> blocks/i, via: 'editor', fixable: true, note: 'Wix Editor → Site Design → Custom CSS panel → Move repeated inline styles there' },
  { match: /^(lcp|cls|fcp)/i, via: 'editor', fixable: true, note: 'Wix Editor → Optimize hero image (compress, resize), reduce above-fold content complexity' },
  { match: /^missing favicon/i, via: 'dashboard', fixable: true, note: 'Wix Dashboard → Site → Favicon → Upload an icon' },
  { match: /^missing viewport meta tag/i, via: 'editor', fixable: false, note: 'Wix handles this automatically — viewport meta is always present on Wix sites' },

  // ═══════════════════════════════════════════════
  // FIXABLE VIA VELO (Wix Code / Dev Mode)
  // ═══════════════════════════════════════════════
  { match: /^inline event handlers/i, via: 'velo', fixable: true, note: 'Velo → Replace onclick="..." with $w(element).on("click", ...) in your page code' },
  { match: /^emails exposed in html/i, via: 'velo', fixable: true, note: 'Velo → Use wix-crm contact form instead of plain text emails, or obfuscate with JS' },
  { match: /^html comments with (TODO|FIXME)/i, via: 'velo', fixable: true, note: 'Velo → Open Dev Mode → Search for TODO/FIXME → Clean up before production' },
  { match: /^browser console errors/i, via: 'velo', fixable: true, note: 'Velo → Open Dev Mode → Check Console & Velo logs → Fix JS errors' },
  { match: /^reverse tabnapping risk/i, via: 'velo', fixable: true, note: 'Velo → In link code, ensure rel="noopener noreferrer" is set on external links' },
  { match: /^duplicate ids/i, via: 'velo', fixable: true, note: 'Velo → Check for hardcoded IDs in custom code; Wix auto-generates unique IDs per element' },
  { match: /^(render-blocking scripts|excessive scripts)/i, via: 'velo', fixable: true, note: 'Velo → Review custom code added via Dev Mode; Wix core scripts are already optimized' },
  { match: /^(short cache TTL|cache disabled)/i, via: 'infrastructure', fixable: false, note: 'Wix CDN manages caching automatically — not user-configurable' },

  // ═══════════════════════════════════════════════
  // NOT FIXABLE — WIX INFRASTRUCTURE
  // ═══════════════════════════════════════════════
  { match: /^no compression enabled/i, via: 'infrastructure', fixable: false, note: 'Wix compresses all assets through its CDN automatically — not configurable' },
  { match: /^no caching headers/i, via: 'infrastructure', fixable: false, note: 'Wix manages caching via its CDN infrastructure — no manual control' },
  { match: /^no preconnect for third-party/i, via: 'infrastructure', fixable: false, note: 'Resource hints are managed by Wix\'s platform — not user-configurable' },
  { match: /^third-party domains/i, via: 'infrastructure', fixable: false, note: 'Wix relies on its own CDN (static.parastorage.com) & ecosystem — these don\'t need preconnecting' },
  { match: /^(slow server response|moderate response time|response time)/i, via: 'infrastructure', fixable: false, note: 'Wix global CDN handles TTFB — not directly configurable' },
  { match: /^multiple stylesheets/i, via: 'infrastructure', fixable: false, note: 'Wix generates stylesheets automatically — consolidation is handled by the platform' },
  { match: /^missing hsts header/i, via: 'infrastructure', fixable: false, note: 'Wix handles HTTPS & HSTS at the platform level — no user configuration needed' },
  { match: /^missing content-security-policy/i, via: 'infrastructure', fixable: false, note: 'Wix sets CSP headers on its platform — not user-configurable' },
  { match: /^missing x-content-type/i, via: 'infrastructure', fixable: false, note: 'MIME-sniffing protection is handled by Wix\'s platform' },
  { match: /^missing x-frame-options/i, via: 'infrastructure', fixable: false, note: 'Wix provides clickjacking protection at the platform level' },
  { match: /^missing referrer-policy/i, via: 'infrastructure', fixable: false, note: 'Referrer policy is managed by Wix\'s platform — not user-configurable' },
  { match: /^missing permissions-policy/i, via: 'infrastructure', fixable: false, note: 'Permissions policy is set by Wix\'s platform' },
  { match: /^server header exposed/i, via: 'infrastructure', fixable: false, note: 'Server header is set by Wix\'s edge infrastructure — cannot be removed' },
  { match: /^x-powered-by exposed/i, via: 'infrastructure', fixable: false, note: 'Technology headers are set by the Wix platform' },
  { match: /^cookie ".*" missing (httponly|secure|samesite)/i, via: 'infrastructure', fixable: false, note: 'Cookie flags for platform cookies are managed by Wix — your app cookies can be set via Velo' },
  { match: /^scripts without sri/i, via: 'infrastructure', fixable: false, note: 'Wix CDN scripts are managed with internal integrity checks — not user-configurable' },
  { match: /^content-type missing charset/i, via: 'infrastructure', fixable: false, note: 'Charset is set by Wix\'s platform automatically' },
];

export function filterForPlatform(issues, platform) {
  if (platform !== 'wix') return issues.map(i => ({ ...i, platformNote: null, platformFixable: true, platformVia: null }));

  return issues.map(issue => {
    const match = WIX_MAP.find(m => m.match.test(issue.title));
    if (match) {
      return {
        ...issue,
        platformNote: match.note,
        platformFixable: match.fixable,
        platformVia: match.via,
      };
    }
    return { ...issue, platformNote: null, platformFixable: true, platformVia: 'editor' };
  });
}

export function isPlatformInfrastructure(issue) {
  return issue.platformFixable === false;
}

const VIA_LABELS = {
  dashboard: 'Wix Dashboard',
  editor: 'Wix Editor',
  velo: 'Velo (Code)',
  infrastructure: 'Wix Infra',
};

export function getViaLabel(via) {
  return VIA_LABELS[via] || via;
}
