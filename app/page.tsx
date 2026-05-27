"use client";

import { useMemo, useState, useEffect } from "react";
import type { FormEvent, JSX } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Loader2, Play, Settings, Activity, FileCheck, 
  CheckCircle2, AlertTriangle, XCircle, ChevronRight
} from "lucide-react";

import type {
  AnalyzeReport,
  ApplyReport,
  CandidateFix,
  Finding,
  ScoreSnapshot
} from "@/lib/types/pipeline";

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
  "Output Layer"
];

function scoreColorHex(value: number): string {
  if (value >= 80) return "#16a34a"; // green
  if (value >= 60) return "#d97706"; // amber
  return "#dc2626"; // red
}

// ----------------------------------------------------------------------
// Dynamic Speedometer Component
// ----------------------------------------------------------------------
function SpeedometerScore({ title, score }: { title: string; score: number }): JSX.Element {
  const [currentScore, setCurrentScore] = useState(0);

  useEffect(() => {
    // Simple spring-like animation effect triggered on mount/score change
    const duration = 1500; // ms
    const startTime = performance.now();
    
    const animate = (time: number) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutCubic
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

  // SVG parameters for a half-circle gauge
  const radius = 60;
  const strokeWidth = 12;
  const circumference = Math.PI * radius; // length of half circle
  // Progress fraction (0 to 1)
  const progress = currentScore / 100;
  const strokeDashoffset = circumference - progress * circumference;

  return (
    <motion.div 
      className="score-panel"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
    >
      <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "1rem" }}>{title}</h3>
      <div style={{ position: "relative", width: "140px", height: "80px" }}>
        {/* Background Track */}
        <svg viewBox="0 0 140 80" style={{ width: "100%", height: "100%", overflow: "visible" }}>
          <path
            d={`M 10 70 A ${radius} ${radius} 0 0 1 130 70`}
            fill="none"
            stroke="#e5e5e5"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Animated Progress Path */}
          <motion.path
            d={`M 10 70 A ${radius} ${radius} 0 0 1 130 70`}
            fill="none"
            stroke={scoreColorHex(currentScore)}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          />
        </svg>
        {/* Number in center */}
        <div style={{
          position: "absolute", bottom: "-5px", left: "0", right: "0", 
          textAlign: "center", fontSize: "2rem", fontWeight: 800, color: scoreColorHex(currentScore)
        }}>
          {currentScore}
        </div>
      </div>
    </motion.div>
  );
}

// ----------------------------------------------------------------------
// Lists and Cards
// ----------------------------------------------------------------------

function FindingsTable({ findings }: { findings: Finding[] }): JSX.Element {
  if (findings.length === 0) {
    return <p className="muted">No findings detected.</p>;
  }

  return (
    <div className="stack">
      <AnimatePresence>
        {findings.map((finding, idx) => (
          <motion.article 
            key={finding.id} 
            className={`finding-card severity-${finding.severity}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
          >
            <div className="finding-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {finding.severity === "high" && <XCircle size={18} color="#dc2626" />}
                {finding.severity === "medium" && <AlertTriangle size={18} color="#d97706" />}
                {finding.severity === "low" && <CheckCircle2 size={18} color="#16a34a" />}
                <h4>{finding.title}</h4>
              </div>
              <span className={`badge badge-${finding.severity}`}>{finding.severity}</span>
            </div>
            <p>{finding.description}</p>
            <small className="muted" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.75rem' }}>
              Source: {finding.source}
            </small>
          </motion.article>
        ))}
      </AnimatePresence>
    </div>
  );
}

function FixSelector({
  fixes,
  selectedFixIds,
  setSelectedFixIds
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
      <AnimatePresence>
        {fixes.map((fix, idx) => {
          const checked = selectedFixIds.includes(fix.id);

          return (
            <motion.label 
              key={fix.id} 
              className="fix-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={(event) => {
                  if (event.target.checked) {
                    setSelectedFixIds([...selectedFixIds, fix.id]);
                  } else {
                    setSelectedFixIds(selectedFixIds.filter((id) => id !== fix.id));
                  }
                }}
              />
              <div style={{ width: "100%" }}>
                <div className="fix-title-row">
                  <h4>{fix.title}</h4>
                  <span className="badge" style={{ background: '#f3f4f6', color: '#4b5563' }}>
                    {Math.round(fix.confidence * 100)}% Match
                  </span>
                </div>
                <p style={{ margin: "0.25rem 0", color: "#404040", fontSize: "0.95rem" }}>{fix.description}</p>
                <p className="muted" style={{ fontSize: "0.85rem", marginTop: "0.5rem" }}>
                  <FileCheck size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                  {fix.targetFile}
                </p>
                <pre>{fix.patchPreview}</pre>
              </div>
            </motion.label>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

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
// Main Page Component
// ----------------------------------------------------------------------

export default function HomePage(): JSX.Element {
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [branch, setBranch] = useState("main");
  const [apiKey, setApiKey] = useState("");
  
  const [analyzeReport, setAnalyzeReport] = useState<AnalyzeReport | null>(null);
  const [applyReport, setApplyReport] = useState<ApplyReport | null>(null);
  const [selectedFixIds, setSelectedFixIds] = useState<string[]>([]);
  
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  function buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "content-type": "application/json"
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

  async function submitAnalyze(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!repositoryUrl.trim() && !siteUrl.trim()) {
      setStatusMessage("Please provide at least a GitHub repository URL or a website URL.");
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
        body: JSON.stringify(requestBody)
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Analyze request failed");
      }

      const report = payload as AnalyzeReport;
      setAnalyzeReport(report);
      setSelectedFixIds(report.recommendedFixes.map((fix) => fix.id));
      setStatusMessage("Analysis completed. Review findings and approve fixes.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Analyze request failed");
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function approveFixes(): Promise<void> {
    if (!analyzeReport) return;

    setIsApplying(true);
    setStatusMessage("Applying selected optimizations and running validation checks...");

    try {
      const response = await fetch(`/api/runs/${analyzeReport.runId}/approve`, {
        method: "POST",
        headers: buildHeaders(),
        body: JSON.stringify({ selectedFixIds })
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Apply request failed");
      }

      setApplyReport(payload as ApplyReport);
      setStatusMessage("Optimizations applied successfully. Review updated analytics.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Apply request failed");
    } finally {
      setIsApplying(false);
    }
  }

  // Active step index for dynamic progress (simulated based on state)
  const getActiveStep = () => {
    if (isApplying) return 8;
    if (applyReport) return 9;
    if (isAnalyzing) return 3;
    if (analyzeReport) return 6;
    return 0;
  };

  const activeStep = getActiveStep();

  return (
    <main className="page-shell">
      <header className="hero">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <Activity size={48} color="#2563eb" style={{ margin: "0 auto 1rem" }} />
          <h1>DiscoverSite Intelligence</h1>
          <p>
            Dynamically analyze, visualize, and apply SEO & GEO optimizations directly to your repository with automated validation.
          </p>
        </motion.div>
      </header>

      <section className="card">
        <h2><Settings size={22} /> Pipeline Architecture</h2>
        <div className="pipeline-track">
          {PIPELINE_STEPS.map((step, index) => {
            const isCompleted = index < activeStep;
            const isCurrent = index === activeStep && (isAnalyzing || isApplying);
            let className = "pipeline-step";
            if (isCompleted) className += " completed";
            if (isCurrent) className += " active";
            
            return (
              <motion.div 
                key={step} 
                className={className}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
              >
                {isCompleted ? <CheckCircle2 size={16} /> : 
                 isCurrent ? <Loader2 size={16} className="spin" /> : 
                 <ChevronRight size={16} color="#9ca3af" />}
                {step}
              </motion.div>
            );
          })}
        </div>
      </section>

      <section className="card">
        <h2><Play size={22} /> Run Analysis</h2>
        <form onSubmit={submitAnalyze} className="form-grid">
          <div className="two-col">
            <div className="input-group">
              <label>GitHub Repository URL <small className="muted">(optional)</small></label>
              <input
                placeholder="https://github.com/org/repo"
                value={repositoryUrl}
                onChange={(event) => setRepositoryUrl(event.target.value)}
              />
            </div>
            <div className="input-group">
              <label>Website URL <small className="muted">(optional)</small></label>
              <input
                placeholder="https://your-site.com"
                value={siteUrl}
                onChange={(event) => setSiteUrl(event.target.value)}
              />
            </div>
          </div>
          <div className="two-col">
            <div className="input-group">
              <label>Target Branch</label>
              <input value={branch} onChange={(event) => setBranch(event.target.value)} />
            </div>
            <div className="input-group">
              <label>API Key <small className="muted">(optional)</small></label>
              <input
                type="password"
                placeholder="Leave blank if not required"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                autoComplete="off"
              />
            </div>
          </div>
          
          <button type="submit" className="btn-primary" disabled={isAnalyzing || isApplying}>
            {isAnalyzing ? <Loader2 size={20} className="spin" /> : <Play size={20} />}
            {isAnalyzing ? "Running Pipeline..." : "Analyze Pipeline"}
          </button>
        </form>

        <AnimatePresence>
          {statusMessage && (
            <motion.div 
              className="status-box"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {(isAnalyzing || isApplying) ? <Loader2 size={18} className="spin" color="#2563eb" /> : <Activity size={18} color="#16a34a" />}
              {statusMessage}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <AnimatePresence>
        {activeScores && (
          <motion.section 
            className="card"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
          >
            <h2><Activity size={22} /> Analytics Dashboard</h2>
            <ScoreGrid scores={activeScores} />
          </motion.section>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {analyzeReport && (
          <motion.section 
            className="card two-col"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
          >
            <div>
              <h2><AlertTriangle size={22} /> System Findings</h2>
              <FindingsTable findings={analyzeReport.findings} />
            </div>
            <div>
              <h2><Settings size={22} /> Optimization Fixes</h2>
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
                  {isApplying ? <Loader2 size={20} className="spin" /> : <CheckCircle2 size={20} />}
                  {isApplying ? "Deploying..." : "Approve & Apply Fixes"}
                </button>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {applyReport && (
          <motion.section 
            className="card"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <h2><CheckCircle2 size={22} /> Output Layer</h2>
            <div style={{ background: "#f8fafc", padding: "1.5rem", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              <p style={{ margin: "0 0 0.5rem 0" }}><strong>Optimized Repository:</strong> <span className="muted">{applyReport.optimizedRepositoryPath}</span></p>
              <p style={{ margin: "0 0 0.5rem 0" }}><strong>Branch:</strong> <span className="muted">{applyReport.branchName}</span></p>
              <p style={{ margin: "0 0 0.5rem 0" }}><strong>Commit:</strong> <span className="muted">{applyReport.commitHash ?? "No changes committed"}</span></p>
              <p style={{ margin: "0" }}><strong>Deployment Hint:</strong> <span style={{ color: "#16a34a" }}>{applyReport.deployHint}</span></p>
            </div>

            <h3 style={{ marginTop: "2rem", marginBottom: "1rem" }}>Validation Checks</h3>
            <div className="stack">
              {applyReport.validation.map((check) => (
                <article key={check.name} className="finding-card">
                  <div className="finding-header">
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {check.success ? <CheckCircle2 size={18} color="#16a34a" /> : <XCircle size={18} color="#dc2626" />}
                      {check.name}
                    </h4>
                    <span className={`badge ${check.success ? "badge-pass" : "badge-fail"}`}>
                      {check.success ? "Passed" : "Failed"}
                    </span>
                  </div>
                  <pre>{check.output}</pre>
                </article>
              ))}
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </main>
  );
}
