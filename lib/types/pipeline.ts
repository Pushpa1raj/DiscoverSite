export type Severity = "low" | "medium" | "high";

export interface AnalyzeRequest {
  repositoryUrl?: string;
  siteUrl?: string;
  branch?: string;
}

export interface Finding {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  source: "crawler" | "static" | "geo";
  evidence?: string;
}

export interface CandidateFix {
  id: string;
  title: string;
  description: string;
  targetFile: string;
  patchPreview: string;
  confidence: number;
  reason: string;
  content: string;
}

export interface ScoreSnapshot {
  seo: number;
  geo: number;
  accessibility: number;
  performance: number;
}

export interface CrawlMetrics {
  title?: string;
  description?: string;
  h1Count: number;
  headingCount: number;
  internalLinkCount: number;
  structuredDataCount: number;
  responseTimeMs: number;
  accessibilityScore: number;
  performanceScore: number;
  lighthouseAvailable: boolean;
}

export interface RepoSnapshot {
  framework: string;
  hasRobots: boolean;
  hasSitemap: boolean;
  hasMetadataFile: boolean;
  routeCount: number;
}

export interface StaticAnalysisResult {
  findings: Finding[];
  snapshot: RepoSnapshot;
  seoScoreContribution: number;
}

export interface GeoAnalysisResult {
  findings: Finding[];
  geoScore: number;
  summary: string;
}

export interface AnalyzeReport {
  runId: string;
  status: "analyzed";
  requestedAt: string;
  repositoryUrl?: string;
  siteUrl?: string;
  baselineScores: ScoreSnapshot;
  findings: Finding[];
  recommendedFixes: CandidateFix[];
  snapshot?: RepoSnapshot;
}

export interface ValidationCheck {
  name: string;
  success: boolean;
  output: string;
}

export interface ApplyRequest {
  selectedFixIds?: string[];
}

export interface ApplyReport {
  runId: string;
  status: "optimized";
  optimizedRepositoryPath: string;
  branchName: string;
  commitHash?: string;
  prUrl?: string;
  deployHint: string;
  appliedFixes: CandidateFix[];
  validation: ValidationCheck[];
  updatedScores: ScoreSnapshot;
}

export interface RunContext {
  report: AnalyzeReport;
  workspacePath: string;
  sourcePath: string;
  siteUrl?: string;
  branch?: string;
}
