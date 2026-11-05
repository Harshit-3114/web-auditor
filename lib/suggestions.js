import { filterForPlatform } from './platform.js';

function crossPageIssues(allPageIssues) {
  const pageMap = {};
  for (const pi of allPageIssues) {
    for (const issue of pi.issues) {
      const key = issue.title;
      if (!pageMap[key]) pageMap[key] = { ...issue, affectedPages: [], teams: new Set() };
      pageMap[key].affectedPages.push(issue.pageUrl || pi.url);
      if (issue.team) pageMap[key].teams.add(issue.team);
    }
  }
  return Object.values(pageMap).map(i => ({ ...i, teams: [...i.teams] })).sort((a, b) => b.affectedPages.length - a.affectedPages.length);
}

export function generateTeamTasks(allPageResults, platform = null) {
  const allIssues = allPageResults.flatMap(pr => {
    const cats = ['seo', 'ux', 'perf', 'sec', 'dups'];
    const issues = [];
    for (const cat of cats) {
      if (pr.audits[cat]) {
        for (const issue of pr.audits[cat].issues) {
          issues.push({ ...issue, pageUrl: pr.url });
        }
      }
    }
    return issues;
  });

  const platformIssues = allIssues.map(i => filterForPlatform([i], platform)[0]);
  const actionableIssues = platform === 'wix' ? platformIssues.filter(i => i.platformFixable !== false) : platformIssues;

  const crossPage = crossPageIssues(allPageResults.map(pr => ({
    url: pr.url,
    issues: ['seo', 'ux', 'perf', 'sec', 'dups'].flatMap(c => (pr.audits[c]?.issues || []).map(i => ({ ...i, pageUrl: pr.url })))
  })));

  const teams = {};
  for (const issue of actionableIssues) {
    const team = issue.team || 'dev';
    if (!teams[team]) teams[team] = [];
    teams[team].push(issue);
  }

  const severityOrder = { high: 0, medium: 1, low: 2 };
  for (const t of Object.keys(teams)) {
    teams[t].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  }

  // Filter cross-page issues for platform mode
  let filteredCrossPage = crossPage;
  if (platform === 'wix') {
    filteredCrossPage = crossPage
      .map(issue => {
        const [first] = filterForPlatform([issue], platform);
        return { ...issue, platformFixable: first?.platformFixable };
      })
      .filter(i => i.platformFixable !== false);
  }

  const teamSummary = {};
  for (const [team, iss] of Object.entries(teams)) {
    const high = iss.filter(i => i.severity === 'high').length;
    const medium = iss.filter(i => i.severity === 'medium').length;
    const low = iss.filter(i => i.severity === 'low').length;
    teamSummary[team] = { total: iss.length, high, medium, low };
  }

  const infraCount = platform === 'wix' ? platformIssues.filter(i => !i.platformFixable).length : 0;

  return {
    totalIssues: platform === 'wix' ? actionableIssues.length : allIssues.length,
    totalIssuesFound: allIssues.length,
    infrastructureCount: infraCount,
    totalPages: allPageResults.length,
    teamSummary,
    teams,
    crossPage: filteredCrossPage,
    allIssues: platform === 'wix' ? actionableIssues : allIssues,
  };
}
