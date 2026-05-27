import type { CandidateFix, CrawlMetrics, GeoAnalysisResult, ScoreSnapshot, StaticAnalysisResult } from "@/lib/types/pipeline";

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function scoreBaseline(
  crawl: CrawlMetrics,
  staticAnalysis: StaticAnalysisResult,
  geoAnalysis: GeoAnalysisResult
): ScoreSnapshot {
  let seo = staticAnalysis.seoScoreContribution;

  if (crawl.title) {
    seo += 4;
  }
  if (crawl.description) {
    seo += 5;
  }
  if (crawl.h1Count === 1) {
    seo += 5;
  }
  if (crawl.structuredDataCount > 0) {
    seo += 6;
  }

  return {
    seo: clampScore(seo),
    geo: clampScore(geoAnalysis.geoScore),
    accessibility: clampScore(crawl.accessibilityScore),
    performance: clampScore(crawl.performanceScore)
  };
}

export function scoreAfterFixes(
  baseline: ScoreSnapshot,
  staticAnalysis: StaticAnalysisResult,
  appliedFixes: CandidateFix[]
): ScoreSnapshot {
  let seoBoost = 0;
  let geoBoost = 0;

  for (const fix of appliedFixes) {
    if (fix.id.includes("robots")) {
      seoBoost += 4;
    }
    if (fix.id.includes("sitemap")) {
      seoBoost += 6;
      geoBoost += 2;
    }
    if (fix.id.includes("metadata")) {
      seoBoost += 8;
      geoBoost += 6;
    }
    if (fix.id.includes("faq-schema")) {
      seoBoost += 4;
      geoBoost += 8;
    }
  }

  return {
    seo: clampScore(Math.max(staticAnalysis.seoScoreContribution, baseline.seo + seoBoost)),
    geo: clampScore(baseline.geo + geoBoost),
    accessibility: baseline.accessibility,
    performance: baseline.performance
  };
}
