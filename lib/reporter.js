import { URL } from 'node:url';
import { getViaLabel } from './platform.js';

function severityIcon(s) { return s === 'high' ? '✗' : s === 'medium' ? '!' : '?'; }

function bar(value, max, width = 20) {
  const filled = Math.round((value / max) * width);
  return '█'.repeat(Math.min(filled, width)) + '░'.repeat(Math.max(width - filled, 0));
}

function pagePath(url) { try { return new URL(url).pathname || '/'; } catch { return url; } }
function pageShort(url) { const p = pagePath(url); return p === '/' ? '/' : p.split('/').filter(Boolean).pop() || p; }

export function printReport(allResults, suggestions, crawlInfo, totalTimeMs, platform = null) {
  const { teamSummary, crossPage, teams, allIssues, infrastructureCount } = suggestions;
  const totalSeconds = (totalTimeMs / 1000).toFixed(1);
  const totalErrs = allResults.reduce((s, r) => s + (r.errors ? r.errors.length : 0), 0);
  const isWix = platform === 'wix';

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║               WEB AUDITOR — SITE REPORT');
  if (isWix) console.log('║               [Wix Studio Mode — fixable issues only]');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  // Executive Summary
  console.log('  ── EXECUTIVE SUMMARY ──────────────────────────────────────────');
  console.log(`  Crawled:  ${crawlInfo.discovered.length} pages found, ${suggestions.totalPages} analyzed`);
  console.log(`  Issues:   ${suggestions.totalIssues} fixable${totalErrs ? ` (${totalErrs} page errors)` : ''}`);
  if (isWix) console.log(`            ${suggestions.totalIssuesFound} total detected, ${infrastructureCount} are Wix infrastructure (no action needed)`);
  console.log(`  Time:     ${totalSeconds}s`);
  console.log('');

  // Severity bars
  const hc = allIssues.filter(i => i.severity === 'high').length;
  const mc = allIssues.filter(i => i.severity === 'medium').length;
  const lc = allIssues.filter(i => i.severity === 'low').length;
  const maxC = Math.max(hc, mc, lc, 1);
  console.log(`  ${'High:'.padEnd(8)} ${bar(hc, maxC)} ${hc}`);
  console.log(`  ${'Medium:'.padEnd(8)} ${bar(mc, maxC)} ${mc}`);
  console.log(`  ${'Low:'.padEnd(8)} ${bar(lc, maxC)} ${lc}`);
  console.log('');

  // Team breakdown
  console.log('  ── PER-TEAM BREAKDOWN ────────────────────────────────────────');
  const teamMeta = { design: 'UX/Design', dev: 'Engineering', seo: 'SEO', security: 'Security' };
  for (const [id, label] of Object.entries(teamMeta)) {
    const s = teamSummary[id];
    if (s) console.log(`  ${label.padEnd(14)} ${s.high} high · ${s.medium} med · ${s.low} low  (${s.total} total)`);
    else console.log(`  ${label.padEnd(14)} 0 issues`);
  }
  console.log('');

  // Cross-page issues
  const crossItems = crossPage.filter(i => i.affectedPages.length > 1);
  if (crossItems.length > 0) {
    console.log('  ── CROSS-PAGE ISSUES ─────────────────────────────────────────');
    for (const issue of crossItems.slice(0, 10)) {
      const pages = issue.affectedPages.slice(0, 6).map(u => pageShort(u));
      console.log(`  ${severityIcon(issue.severity)}  ${issue.title}`);
      console.log(`     ${issue.affectedPages.length} pages: ${pages.join(', ')}${issue.affectedPages.length > 6 ? '...' : ''}`);
      console.log('');
    }
  }

  // Action items per team
  for (const [team, label] of Object.entries(teamMeta)) {
    const items = teams[team];
    if (!items || items.length === 0) continue;

    console.log(`  ── ${label} — ACTION ITEMS${isWix ? ' (fixable in Wix)' : ''} ───`);

    for (const sev of ['high', 'medium', 'low']) {
      const levelItems = items.filter(i => i.severity === sev);
      if (levelItems.length === 0) continue;
      const seen = new Set();
      console.log(`\n  ${sev.toUpperCase()}:`);
      for (const item of levelItems) {
        const key = item.title + '|' + item.detail;
        if (seen.has(key)) continue;
        seen.add(key);
        const affPages = allResults
          .filter(r => ['seo', 'ux', 'perf', 'sec', 'dups'].some(c => r.audits[c]?.issues.some(i => i.title === item.title && i.detail === item.detail)))
          .map(r => pageShort(r.url));
        const pg = affPages.length > 1 ? ` (${affPages[0]} +${affPages.length - 1})` : affPages.length === 1 ? ` (${affPages[0]})` : '';
        const viaTag = isWix && item.platformVia ? ` [${getViaLabel(item.platformVia)}]` : '';
        console.log(`  ${severityIcon(item.severity)}${viaTag} ${item.title}${pg}`);
        console.log(`     ${item.detail}`);
        if (isWix && item.platformNote) {
          console.log(`     → ${item.platformNote}`);
        }
      }
    }
    console.log('');
  }

  if (isWix) {
    console.log('  ── WIX FIX LEGEND ────────────────────────────────────────────────');
    console.log('  [Wix Dashboard] — Fix in Wix Dashboard settings/SEO panels');
    console.log('  [Wix Editor]    — Fix in the Visual Editor (click the element)');
    console.log('  [Velo (Code)]   — Fix using Velo Dev Mode (JavaScript)');
    console.log('  (no badge)      — No Wix-specific guidance, apply standard web best practices');
    console.log('');
  }

  // Per-page ranking
  console.log('  ── PAGES RANKED BY ISSUES ─────────────────────────────────────');
  const ranked = [...allResults].sort((a, b) => {
    const ca = ['seo', 'ux', 'perf', 'sec', 'dups'].reduce((s, c) => s + (a.audits[c]?.issues.length || 0), 0);
    const cb = ['seo', 'ux', 'perf', 'sec', 'dups'].reduce((s, c) => s + (b.audits[c]?.issues.length || 0), 0);
    return cb - ca;
  });
  for (const pr of ranked.slice(0, 20)) {
    const count = ['seo', 'ux', 'perf', 'sec', 'dups'].reduce((s, c) => s + (pr.audits[c]?.issues.length || 0), 0);
    const hc2 = ['seo', 'ux', 'perf', 'sec', 'dups'].reduce((s, c) => s + (pr.audits[c]?.issues.filter(i => i.severity === 'high').length || 0), 0);
    const path = pagePath(pr.url);
    const errs = pr.errors && pr.errors.length > 0 ? ` [${pr.errors.length} err]` : '';
    console.log(`  ${String(count).padStart(3)} issues  ${path}${errs}${hc2 ? ` (${hc2} high)` : ''}`);
  }
  console.log('');

  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
}
