import { access, readFile } from "node:fs/promises";
import path from "node:path";

import { inspectRepository } from "@/lib/services/githubService";
import type { Finding, StaticAnalysisResult } from "@/lib/types/pipeline";

function hasToken(content: string, token: string): boolean {
  return content.toLowerCase().includes(token.toLowerCase());
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function runStaticAnalysis(repositoryPath: string): Promise<StaticAnalysisResult> {
  const snapshot = await inspectRepository(repositoryPath);
  const findings: Finding[] = [];

  if (!snapshot.hasRobots) {
    findings.push({
      id: "missing-robots",
      title: "Missing robots.txt",
      description: "Search crawlers have no crawl guidance file in /public/robots.txt.",
      severity: "high",
      source: "static"
    });
  }

  if (!snapshot.hasSitemap) {
    findings.push({
      id: "missing-sitemap",
      title: "Missing sitemap",
      description: "No sitemap.xml or App Router sitemap implementation was detected.",
      severity: "high",
      source: "static"
    });
  }

  if (!snapshot.hasMetadataFile) {
    findings.push({
      id: "missing-metadata",
      title: "Missing metadata configuration",
      description: "No centralized metadata file was found for OG, canonical, or Twitter tags.",
      severity: "high",
      source: "static"
    });
  }

  const layoutPath = path.join(repositoryPath, "app", "layout.tsx");
  if (await fileExists(layoutPath)) {
    const layoutContent = await readFile(layoutPath, "utf8");

    if (!hasToken(layoutContent, "openGraph")) {
      findings.push({
        id: "missing-og-metadata",
        title: "Open Graph metadata appears incomplete",
        description: "No openGraph metadata structure was found in app/layout.tsx.",
        severity: "medium",
        source: "static"
      });
    }

    if (!hasToken(layoutContent, "twitter")) {
      findings.push({
        id: "missing-twitter-metadata",
        title: "Twitter metadata appears incomplete",
        description: "No twitter card metadata structure was found in app/layout.tsx.",
        severity: "medium",
        source: "static"
      });
    }

    if (!hasToken(layoutContent, "lang=")) {
      findings.push({
        id: "missing-html-lang",
        title: "Missing html language attribute",
        description: "The root html element should declare a language for accessibility and parser clarity.",
        severity: "medium",
        source: "static"
      });
    }
  }

  if (snapshot.routeCount === 0) {
    findings.push({
      id: "no-routes-detected",
      title: "No routes detected",
      description: "No indexable routes were found. This usually hurts discoverability.",
      severity: "medium",
      source: "static"
    });
  }

  let seoScoreContribution = 90;
  for (const finding of findings) {
    if (finding.severity === "high") {
      seoScoreContribution -= 12;
    } else if (finding.severity === "medium") {
      seoScoreContribution -= 6;
    } else {
      seoScoreContribution -= 3;
    }
  }

  seoScoreContribution = Math.max(0, Math.min(100, seoScoreContribution));

  return {
    findings,
    snapshot,
    seoScoreContribution
  };
}
