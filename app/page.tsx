"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import type { FormEvent, JSX } from "react";
import {
  Loader2,
  Sparkles,
  Settings,
  Activity,
  FileCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronRight,
  ChevronDown,
  GitBranch,
  Globe,
  Search,
  Shield,
  ArrowRight,
  Zap,
} from "lucide-react";

import type {
  AnalyzeReport,
  ApplyReport,
  CandidateFix,
  Finding,
  ScoreSnapshot,
} from "@/lib/types/pipeline";

// ----------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------

const PIPELINE_STEPS = [
  "Frontend Dashboard",
  "API Gateway",
  "GitHub Service",
  "Website Crawler",
  "Static Analysis",
  "GEO AI Engine",
  "Fix Generator",
  "Validation Engine",
  "Safe Repo Manager",
  "Output Layer",
];

const EXAMPLE_REPOS = [
  { label: "vercel/next.js", url: "https://github.com/vercel/next.js" },
  { label: "shadcn-ui/ui", url: "https://github.com/shadcn-ui/ui" },
  { label: "facebook/react", url: "https://github.com/facebook/react" },
];

const DEMO_SCORES: ScoreSnapshot = {
  seo: 72,
  geo: 45,
  accessibility: 88,
  performance: 91,
};

const DEMO_FINDINGS: Finding[] = [
  {
    id: "demo-1",
    title: "Meta description missing on 3 routes",
    description:
      "AI search engines rely on meta descriptions to summarize pages for retrieval context.",
    severity: "high",
    source: "crawler",
  },
  {
    id: "demo-2",
    title: "No structured data (JSON-LD) detected",
    description:
      "Structured data improves entity clarity and rich snippet eligibility for LLM-based discovery.",
    severity: "medium",
    source: "static",
  },
  {
    id: "demo-3",
    title: "robots.txt allows all crawlers",
    description:
      "Properly configured robots.txt ensures AI crawlers can index your content.",
    severity: "low",
    source: "static",
  },
];

// ----------------------------------------------------------------------
// Utility
// ----------------------------------------------------------------------

function scoreColorHex(value: number): string {
  if (value >= 80) return "#16a34a";
  if (value >= 60) return "#d97706";
  return "#dc2626";
}

function isValidUrl(url: string): boolean {
  if (!url.trim()) return true; // empty = neutral
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

function isValidGithubUrl(url: string): boolean {
  if (!url.trim()) return true;
  return isValidUrl(url) && url.includes("github.com/");
}

// ----------------------------------------------------------------------
// GitHub SVG Icon
// ----------------------------------------------------------------------

function GitHubIcon({
  size = 18,
  className,
}: {
  size?: number;
  className?: string;
}): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

// ----------------------------------------------------------------------
// Speedometer Score (CSS-only animation)
// ----------------------------------------------------------------------

function SpeedometerScore({
  title,
  score,
}: {
  title: string;
  score: number;
}): JSX.Element {
  const [currentScore, setCurrentScore] = useState(0);

  useEffect(() => {
    const duration = 1500;
    const startTime = performance.now();

    const animate = (time: number) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setCurrentScore(Math.round(ease * score));

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setCurrentScore(score);
      }
    };

    requestAnimationFrame(animate);
  }, [score]);

  const radius = 60;
  const strokeWidth = 10;
  const circumference = Math.PI * radius;
  const progress = currentScore / 100;
  const strokeDashoffset = circumference - progress * circumference;

  return (
    <div
      className="score-panel animate-fade-in-up"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <h3
        style={{
          fontSize: "0.85rem",
          fontWeight: 600,
          marginBottom: "0.75rem",
          color: "var(--text-secondary)",
        }}
      >
        {title}
      </h3>
      <div style={{ position: "relative", width: "140px", height: "80px" }}>
        <svg
          viewBox="0 0 140 80"
          style={{ width: "100%", height: "100%", overflow: "visible" }}
        >
          <path
            d={`M 10 70 A ${radius} ${radius} 0 0 1 130 70`}
            fill="none"
            stroke="var(--line)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          <path
            d={`M 10 70 A ${radius} ${radius} 0 0 1 130 70`}
            fill="none"
            stroke={scoreColorHex(currentScore)}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{
              transition: "stroke-dashoffset 1.5s ease-out",
            }}
          />
        </svg>
        <div
          style={{
            position: "absolute",
            bottom: "-4px",
            left: "0",
            right: "0",
            textAlign: "center",
            fontSize: "1.75rem",
            fontWeight: 800,
            color: scoreColorHex(currentScore),
          }}
        >
          {currentScore}
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// Findings Table (CSS animations)
// ----------------------------------------------------------------------

function FindingsTable({ findings }: { findings: Finding[] }): JSX.Element {
  if (findings.length === 0) {
    return <p className="muted">No findings detected.</p>;
  }

  return (
    <div className="stack">
      {findings.map((finding, idx) => (
        <article
          key={finding.id}
          className={`finding-card severity-${finding.severity} animate-slide-in-right stagger-${Math.min(
            idx + 1,
            9
          )}`}
        >
          <div className="finding-header">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              {finding.severity === "high" && (
                <XCircle size={16} color="#dc2626" />
              )}
              {finding.severity === "medium" && (
                <AlertTriangle size={16} color="#d97706" />
              )}
              {finding.severity === "low" && (
                <CheckCircle2 size={16} color="#16a34a" />
              )}
              <h4>{finding.title}</h4>
            </div>
            <span className={`badge badge-${finding.severity}`}>
              {finding.severity}
            </span>
          </div>
          <p>{finding.description}</p>
          <small
            className="muted"
            style={{
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              fontSize: "0.7rem",
            }}
          >
            Source: {finding.source}
          </small>
        </article>
      ))}
    </div>
  );
}

// ----------------------------------------------------------------------
// Fix Selector (CSS animations)
// ----------------------------------------------------------------------

function FixSelector({
  fixes,
  selectedFixIds,
  setSelectedFixIds,
}: {
  fixes: CandidateFix[];
  selectedFixIds: string[];
  setSelectedFixIds: (ids: string[]) => void;
}): JSX.Element {
  if (fixes.length === 0) {
    return <p className="muted">No generated fixes.</p>;
  }

  return (
    <div className="stack">
      {fixes.map((fix, idx) => {
        const checked = selectedFixIds.includes(fix.id);

        return (
          <label
            key={fix.id}
            className={`fix-card animate-fade-in-up stagger-${Math.min(
              idx + 1,
              9
            )}`}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={(event) => {
                if (event.target.checked) {
                  setSelectedFixIds([...selectedFixIds, fix.id]);
                } else {
                  setSelectedFixIds(
                    selectedFixIds.filter((id) => id !== fix.id)
                  );
                }
              }}
            />
            <div style={{ width: "100%" }}>
              <div className="fix-title-row">
                <h4>{fix.title}</h4>
                <span
                  className="badge"
                  style={{
                    background: "rgba(37, 99, 235, 0.06)",
                    color: "var(--accent)",
                  }}
                >
                  {Math.round(fix.confidence * 100)}% Match
                </span>
              </div>
              <p
                style={{
                  margin: "0.25rem 0",
                  color: "var(--text-secondary)",
                  fontSize: "0.9rem",
                }}
              >
                {fix.description}
              </p>
              <p
                className="muted"
                style={{ fontSize: "0.8rem", marginTop: "0.4rem" }}
              >
                <FileCheck
                  size={13}
                  style={{
                    display: "inline",
                    verticalAlign: "middle",
                    marginRight: "4px",
                  }}
                />
                {fix.targetFile}
              </p>
              <pre>{fix.patchPreview}</pre>
            </div>
          </label>
        );
      })}
    </div>
  );
}

// ----------------------------------------------------------------------
// Score Grid
// ----------------------------------------------------------------------

function ScoreGrid({ scores }: { scores: ScoreSnapshot }): JSX.Element {
  return (
    <div className="score-grid">
      <SpeedometerScore title="SEO Efficiency" score={scores.seo} />
      <SpeedometerScore title="GEO Optimization" score={scores.geo} />
      <SpeedometerScore title="Accessibility" score={scores.accessibility} />
      <SpeedometerScore title="Performance" score={scores.performance} />
    </div>
  );
}

// ----------------------------------------------------------------------
// 3-Step Visual Flow
// ----------------------------------------------------------------------

function StepsFlow(): JSX.Element {
  return (
    <section className="steps-section">
      <div className="steps-flow">
        <div className="step-card animate-fade-in-up stagger-1">
          <div className="step-number">1</div>
          <GitBranch
            size={22}
            color="var(--accent)"
            style={{ marginBottom: "0.5rem" }}
          />
          <h3>Connect Repository</h3>
          <p>Paste your GitHub URL and we clone &amp; analyze your codebase</p>
        </div>

        <div className="step-connector animate-fade-in stagger-2">
          <ArrowRight size={20} />
        </div>

        <div className="step-card animate-fade-in-up stagger-3">
          <div className="step-number">2</div>
          <Search
            size={22}
            color="var(--accent)"
            style={{ marginBottom: "0.5rem" }}
          />
          <h3>AI Detects Issues</h3>
          <p>GEO engine + static analysis find optimization gaps</p>
        </div>

        <div className="step-connector animate-fade-in stagger-4">
          <ArrowRight size={20} />
        </div>

        <div className="step-card animate-fade-in-up stagger-5">
          <div className="step-number">3</div>
          <Shield
            size={22}
            color="var(--accent)"
            style={{ marginBottom: "0.5rem" }}
          />
          <h3>Generate Safe Fixes</h3>
          <p>Review &amp; apply validated patches directly to your repo</p>
        </div>
      </div>
    </section>
  );
}

// ----------------------------------------------------------------------
// Results Preview (Demo Data)
// ----------------------------------------------------------------------

function ResultsPreview({
  onCTAClick,
}: {
  onCTAClick: () => void;
}): JSX.Element {
  return (
    <div className="results-preview-wrapper">
      <div className="results-preview">
        <div className="card" style={{ marginTop: 0 }}>
          <h2>
            <Activity size={20} /> Sample Analysis Results
          </h2>
          <ScoreGrid scores={DEMO_SCORES} />
          <div style={{ marginTop: "1.5rem" }}>
            <FindingsTable findings={DEMO_FINDINGS} />
          </div>
        </div>
      </div>
      <div className="results-overlay">
        <p>Run your first analysis to see real results</p>
        <button type="button" className="btn-primary" onClick={onCTAClick}>
          <Sparkles size={16} />
          <span>Try It Now</span>
        </button>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// Pipeline Progress Messages
// ----------------------------------------------------------------------

const PIPELINE_MESSAGES = [
  "Cloning repository and scanning file structure...",
  "Validating API gateway credentials...",
  "Fetching repository metadata from GitHub...",
  "Crawling website for SEO signals...",
  "Running static analysis on source files...",
  "GEO AI Engine analyzing content discoverability...",
  "Generating optimization fix candidates...",
  "Validating generated patches...",
  "Preparing safe repository changes...",
  "Finalizing analysis report...",
];

// ----------------------------------------------------------------------
// Main Page Component
// ----------------------------------------------------------------------

export default function HomePage(): JSX.Element {
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [branch, setBranch] = useState("main");
  const [apiKey, setApiKey] = useState("");

  const [analyzeReport, setAnalyzeReport] = useState<AnalyzeReport | null>(
    null
  );
  const [applyReport, setApplyReport] = useState<ApplyReport | null>(null);
  const [selectedFixIds, setSelectedFixIds] = useState<string[]>([]);

  const [statusMessage, setStatusMessage] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [pipelineStage, setPipelineStage] = useState(0);
  const [pipelineOpen, setPipelineOpen] = useState(false);

  // Cycle through pipeline messages during analysis
  useEffect(() => {
    if (!isAnalyzing && !isApplying) {
      setPipelineStage(0);
      return;
    }
    const interval = setInterval(() => {
      setPipelineStage((prev) => (prev + 1) % PIPELINE_MESSAGES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [isAnalyzing, isApplying]);

  // Auto-expand pipeline when running
  useEffect(() => {
    if (isAnalyzing || isApplying) {
      setPipelineOpen(true);
    }
  }, [isAnalyzing, isApplying]);

  function buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "content-type": "application/json",
    };
    if (apiKey.trim()) {
      headers["x-api-key"] = apiKey.trim();
    }
    return headers;
  }

  const activeScores = useMemo(() => {
    if (applyReport) return applyReport.updatedScores;
    return analyzeReport?.baselineScores ?? null;
  }, [analyzeReport, applyReport]);

  const scrollToForm = useCallback(() => {
    document.getElementById("analyze-form")?.scrollIntoView({ behavior: "smooth" });
  }, []);

  async function submitAnalyze(
    event: FormEvent<HTMLFormElement>
  ): Promise<void> {
    event.preventDefault();

    if (!repositoryUrl.trim() && !siteUrl.trim()) {
      setStatusMessage(
        "Please provide at least a GitHub repository URL or a website URL."
      );
      return;
    }

    setIsAnalyzing(true);
    setApplyReport(null);
    setStatusMessage("Analyzing repository and website intelligence...");

    const requestBody: Record<string, string> = {};
    if (repositoryUrl.trim()) requestBody.repositoryUrl = repositoryUrl.trim();
    if (siteUrl.trim()) requestBody.siteUrl = siteUrl.trim();
    if (branch.trim()) requestBody.branch = branch.trim();

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: buildHeaders(),
        body: JSON.stringify(requestBody),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Analyze request failed");
      }

      const report = payload as AnalyzeReport;
      setAnalyzeReport(report);
      setSelectedFixIds(report.recommendedFixes.map((fix) => fix.id));
      setStatusMessage(
        "Analysis completed. Review findings and approve fixes."
      );
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Analyze request failed"
      );
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function approveFixes(): Promise<void> {
    if (!analyzeReport) return;

    setIsApplying(true);
    setStatusMessage(
      "Applying selected optimizations and running validation checks..."
    );

    try {
      const response = await fetch(
        `/api/runs/${analyzeReport.runId}/approve`,
        {
          method: "POST",
          headers: buildHeaders(),
          body: JSON.stringify({ selectedFixIds }),
        }
      );

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Apply request failed");
      }

      setApplyReport(payload as ApplyReport);
      setStatusMessage(
        "Optimizations applied successfully. Review updated analytics."
      );
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Apply request failed"
      );
    } finally {
      setIsApplying(false);
    }
  }

  // Active step for pipeline visualization
  const getActiveStep = () => {
    if (isApplying) return 8;
    if (applyReport) return 9;
    if (isAnalyzing) return pipelineStage;
    if (analyzeReport) return 9;
    return 0;
  };

  const activeStep = getActiveStep();

  // Input validation states
  const repoValidation = repositoryUrl.trim()
    ? isValidGithubUrl(repositoryUrl)
      ? "valid"
      : "invalid"
    : "neutral";
  const siteValidation = siteUrl.trim()
    ? isValidUrl(siteUrl)
      ? "valid"
      : "invalid"
    : "neutral";

  return (
    <main className="page-shell">
      {/* ─── Hero ─── */}
      <header className="hero">
        <div className="animate-fade-in-up">
          <div className="hero-badge">
            <Zap size={14} />
            AI-Powered Analysis Engine
          </div>
          <h1>
            SEO &amp; GEO Analysis
            <br />
            for Your Repository
          </h1>
          <p>
            Analyze your website, detect optimization gaps, and generate safe
            fixes — all committed directly to your repo.
          </p>
          <div className="hero-trust">
            <Shield size={14} />
            Built for developers shipping production-grade SEO
          </div>
        </div>
      </header>

      {/* ─── 3-Step Flow ─── */}
      <StepsFlow />

      {/* ─── Analyze Form ─── */}
      <section className="card" id="analyze-form">
        <h2>
          <Sparkles size={20} /> Run Analysis
        </h2>
        <form onSubmit={submitAnalyze} className="form-grid">
          <div className="two-col">
            <div className="input-group">
              <label>
                GitHub Repository URL{" "}
                <small className="muted">(optional)</small>
              </label>
              <div className="input-with-icon">
                <span className="input-icon">
                  <GitHubIcon size={18} />
                </span>
                <input
                  placeholder="https://github.com/org/repo"
                  value={repositoryUrl}
                  onChange={(event) => setRepositoryUrl(event.target.value)}
                  className={
                    repoValidation === "valid"
                      ? "input-valid"
                      : repoValidation === "invalid"
                        ? "input-invalid"
                        : ""
                  }
                />
              </div>
            </div>
            <div className="input-group">
              <label>
                Website URL <small className="muted">(optional)</small>
              </label>
              <div className="input-with-icon">
                <span className="input-icon">
                  <Globe size={18} />
                </span>
                <input
                  placeholder="https://your-site.com"
                  value={siteUrl}
                  onChange={(event) => setSiteUrl(event.target.value)}
                  className={
                    siteValidation === "valid"
                      ? "input-valid"
                      : siteValidation === "invalid"
                        ? "input-invalid"
                        : ""
                  }
                />
              </div>
            </div>
          </div>

          {/* Example Chips */}
          <div className="example-chips">
            <span>Try:</span>
            {EXAMPLE_REPOS.map((repo) => (
              <button
                key={repo.label}
                type="button"
                className="chip"
                onClick={() => setRepositoryUrl(repo.url)}
              >
                <GitHubIcon size={12} />
                {repo.label}
              </button>
            ))}
          </div>

          <div className="two-col">
            <div className="input-group">
              <label>Target Branch</label>
              <div className="input-with-icon">
                <span className="input-icon">
                  <GitBranch size={16} />
                </span>
                <input
                  value={branch}
                  onChange={(event) => setBranch(event.target.value)}
                />
              </div>
            </div>
            <div className="input-group">
              <label>
                API Key <small className="muted">(optional)</small>
              </label>
              <input
                type="password"
                placeholder="Leave blank if not required"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                autoComplete="off"
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={isAnalyzing || isApplying}
          >
            {isAnalyzing ? (
              <Loader2 size={18} className="spin" />
            ) : (
              <Sparkles size={18} />
            )}
            <span>
              {isAnalyzing ? "Running Analysis..." : "Run AI Audit"}
            </span>
          </button>
        </form>

        {statusMessage && (
          <div className="status-box animate-fade-in-up">
            {isAnalyzing || isApplying ? (
              <Loader2
                size={16}
                className="spin"
                color="var(--accent)"
              />
            ) : (
              <CheckCircle2 size={16} color="#16a34a" />
            )}
            <div>
              <div>{statusMessage}</div>
              {(isAnalyzing || isApplying) && (
                <div
                  key={pipelineStage}
                  className="animate-fade-in-up"
                  style={{
                    fontSize: "0.8rem",
                    color: "var(--muted)",
                    marginTop: "0.25rem",
                  }}
                >
                  {PIPELINE_MESSAGES[pipelineStage]}
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* ─── Results Preview (shown before first analysis) ─── */}
      {!analyzeReport && !isAnalyzing && (
        <ResultsPreview onCTAClick={scrollToForm} />
      )}

      {/* ─── Analytics Dashboard (real data) ─── */}
      {activeScores && (
        <section className="card animate-fade-in">
          <h2>
            <Activity size={20} /> Analytics Dashboard
          </h2>
          <ScoreGrid scores={activeScores} />
        </section>
      )}

      {/* ─── Findings & Fixes ─── */}
      {analyzeReport && (
        <section className="card two-col animate-fade-in-up">
          <div>
            <h2>
              <AlertTriangle size={20} /> Detected Issues
            </h2>
            <FindingsTable findings={analyzeReport.findings} />
          </div>
          <div>
            <h2>
              <Settings size={20} /> Recommended Fixes
            </h2>
            <FixSelector
              fixes={analyzeReport.recommendedFixes}
              selectedFixIds={selectedFixIds}
              setSelectedFixIds={setSelectedFixIds}
            />
            <div style={{ marginTop: "1.5rem" }}>
              <button
                type="button"
                className="btn-primary"
                disabled={isApplying || selectedFixIds.length === 0}
                onClick={approveFixes}
              >
                {isApplying ? (
                  <Loader2 size={18} className="spin" />
                ) : (
                  <CheckCircle2 size={18} />
                )}
                <span>
                  {isApplying ? "Deploying..." : "Approve & Apply Fixes"}
                </span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ─── Output Layer ─── */}
      {applyReport && (
        <section className="card animate-scale-in">
          <h2>
            <CheckCircle2 size={20} /> Output Layer
          </h2>
          <div className="output-details">
            <p>
              <strong>Optimized Repository:</strong>{" "}
              <span className="muted">
                {applyReport.optimizedRepositoryPath}
              </span>
            </p>
            <p>
              <strong>Branch:</strong>{" "}
              <span className="muted">{applyReport.branchName}</span>
            </p>
            <p>
              <strong>Commit:</strong>{" "}
              <span className="muted">
                {applyReport.commitHash ?? "No changes committed"}
              </span>
            </p>
            <p>
              <strong>Deployment Hint:</strong>{" "}
              <span style={{ color: "#16a34a" }}>
                {applyReport.deployHint}
              </span>
            </p>
          </div>

          <h3 style={{ marginTop: "2rem", marginBottom: "1rem" }}>
            Validation Checks
          </h3>
          <div className="stack">
            {applyReport.validation.map((check) => (
              <article key={check.name} className="finding-card">
                <div className="finding-header">
                  <h4
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    {check.success ? (
                      <CheckCircle2 size={16} color="#16a34a" />
                    ) : (
                      <XCircle size={16} color="#dc2626" />
                    )}
                    {check.name}
                  </h4>
                  <span
                    className={`badge ${check.success ? "badge-pass" : "badge-fail"}`}
                  >
                    {check.success ? "Passed" : "Failed"}
                  </span>
                </div>
                <pre>{check.output}</pre>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* ─── Pipeline Architecture (Collapsible) ─── */}
      <details
        className="collapsible-section"
        open={pipelineOpen}
        onToggle={(e) =>
          setPipelineOpen((e.target as HTMLDetailsElement).open)
        }
      >
        <summary>
          <Settings size={18} />
          Pipeline Architecture
          <ChevronDown
            size={16}
            style={{
              marginLeft: "auto",
              transition: "transform 0.2s",
              transform: pipelineOpen ? "rotate(180deg)" : "rotate(0deg)",
            }}
          />
        </summary>
        <div className="collapsible-content">
          <div className="pipeline-track">
            {PIPELINE_STEPS.map((step, index) => {
              const isCompleted = index < activeStep;
              const isCurrent =
                index === activeStep && (isAnalyzing || isApplying);
              let className = "pipeline-step";
              if (isCompleted) className += " completed";
              if (isCurrent) className += " active";

              return (
                <div
                  key={step}
                  className={`${className} animate-scale-in stagger-${Math.min(
                    index + 1,
                    9
                  )}`}
                >
                  {isCompleted ? (
                    <CheckCircle2 size={14} />
                  ) : isCurrent ? (
                    <Loader2 size={14} className="spin" />
                  ) : (
                    <ChevronRight size={14} color="var(--muted)" />
                  )}
                  {step}
                </div>
              );
            })}
          </div>
        </div>
      </details>
    </main>
  );
}
