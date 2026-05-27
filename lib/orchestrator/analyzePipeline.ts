import { randomUUID } from "node:crypto";

import { saveRunContext } from "@/lib/state/runStore";
import { generateFixes } from "@/lib/services/fixGenerator";
import { runGeoAnalysis } from "@/lib/services/geoAiEngine";
import { createRunWorkspace, cloneRepository, installDependencies } from "@/lib/services/safeRepoManager";
import { runStaticAnalysis } from "@/lib/services/staticAnalysisEngine";
import { crawlWebsite } from "@/lib/services/websiteCrawler";
import { scoreBaseline } from "@/lib/orchestrator/scoring";
import type {
  AnalyzeReport,
  AnalyzeRequest,
  CrawlMetrics,
  Finding,
  RepoSnapshot,
  StaticAnalysisResult,
  GeoAnalysisResult
} from "@/lib/types/pipeline";

function crawlerFindings(crawl: CrawlMetrics): Finding[] {
  const findings: Finding[] = [];

  if (!crawl.title) {
    findings.push({
      id: "crawler-missing-title",
      title: "Missing page title",
      description: "No <title> tag detected on the provided URL.",
      severity: "high",
      source: "crawler"
    });
  }

  if (!crawl.description) {
    findings.push({
      id: "crawler-missing-description",
      title: "Missing meta description",
      description: "No meta description detected on the provided URL.",
      severity: "high",
      source: "crawler"
    });
  }

  if (crawl.responseTimeMs > 1_500) {
    findings.push({
      id: "crawler-slow-response",
      title: "High response latency",
      description: `Initial response time is ${crawl.responseTimeMs}ms which may impact crawl efficiency.`,
      severity: "medium",
      source: "crawler"
    });
  }

  if (crawl.h1Count !== 1) {
    findings.push({
      id: "crawler-heading-structure",
      title: "Heading hierarchy warning",
      description: `Expected 1 H1 but detected ${crawl.h1Count}.`,
      severity: "medium",
      source: "crawler"
    });
  }

  return findings;
}

const EMPTY_CRAWL: CrawlMetrics = {
  h1Count: 0,
  headingCount: 0,
  internalLinkCount: 0,
  structuredDataCount: 0,
  responseTimeMs: 0,
  accessibilityScore: 0,
  performanceScore: 0,
  lighthouseAvailable: false
};

const EMPTY_STATIC: StaticAnalysisResult = {
  findings: [],
  snapshot: {
    framework: "Unknown",
    hasRobots: false,
    hasSitemap: false,
    hasMetadataFile: false,
    routeCount: 0
  },
  seoScoreContribution: 0
};

const EMPTY_GEO: GeoAnalysisResult = {
  findings: [],
  geoScore: 0,
  summary: "GEO analysis skipped — no website URL provided."
};

export async function runAnalyzePipeline(request: AnalyzeRequest): Promise<AnalyzeReport> {
  const runId = randomUUID();
  const hasRepo = Boolean(request.repositoryUrl);
  const hasSite = Boolean(request.siteUrl);

  const siteUrl = request.siteUrl ? new URL(request.siteUrl).toString() : undefined;

  // --- Clone repository if provided ---
  const workspace = await createRunWorkspace(runId);
  let staticAnalysis: StaticAnalysisResult = EMPTY_STATIC;

  if (hasRepo) {
    await cloneRepository(request.repositoryUrl!, workspace.sourcePath, request.branch);
    await installDependencies(workspace.sourcePath);
    staticAnalysis = await runStaticAnalysis(workspace.sourcePath);
  }

  const snapshot = staticAnalysis.snapshot;

  // --- Crawl website if provided ---
  let crawl: CrawlMetrics = EMPTY_CRAWL;

  if (hasSite && siteUrl) {
    crawl = await crawlWebsite(siteUrl);
  }

  // --- GEO analysis (uses both crawl + static when available) ---
  let geoAnalysis: GeoAnalysisResult = EMPTY_GEO;

  if (hasSite && siteUrl) {
    geoAnalysis = await runGeoAnalysis({
      siteUrl,
      crawl,
      snapshot,
      staticFindings: staticAnalysis.findings
    });
  }

  // --- Assemble findings ---
  const findings: Finding[] = [];

  if (hasSite) {
    findings.push(...crawlerFindings(crawl));
  }

  findings.push(...staticAnalysis.findings);
  findings.push(...geoAnalysis.findings);

  // --- Generate fixes (repo-only, needs snapshot) ---
  const fixes = generateFixes({
    siteUrl: siteUrl ?? "https://example.com",
    snapshot,
    findings
  });

  const baselineScores = scoreBaseline(crawl, staticAnalysis, geoAnalysis);

  const report: AnalyzeReport = {
    runId,
    status: "analyzed",
    requestedAt: new Date().toISOString(),
    repositoryUrl: request.repositoryUrl,
    siteUrl,
    baselineScores,
    findings,
    recommendedFixes: fixes,
    snapshot: hasRepo ? snapshot : undefined
  };

  saveRunContext({
    report,
    workspacePath: workspace.workspacePath,
    sourcePath: workspace.sourcePath,
    siteUrl,
    branch: request.branch
  });

  return report;
}
