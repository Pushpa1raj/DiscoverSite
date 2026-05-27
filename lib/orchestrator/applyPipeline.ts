import { access } from "node:fs/promises";
import path from "node:path";

import { getRunContext } from "@/lib/state/runStore";
import { scoreAfterFixes } from "@/lib/orchestrator/scoring";
import {
  applyFixes,
  cleanupWorkspace,
  createBranch,
  createCommit,
  createOptimizedCopy,
  installDependencies
} from "@/lib/services/safeRepoManager";
import { runStaticAnalysis } from "@/lib/services/staticAnalysisEngine";
import { runValidation } from "@/lib/services/validationEngine";
import type { ApplyReport, StaticAnalysisResult } from "@/lib/types/pipeline";

async function directoryExists(dirPath: string): Promise<boolean> {
  try {
    await access(dirPath);
    return true;
  } catch {
    return false;
  }
}

export async function runApplyPipeline(
  runId: string,
  selectedFixIds?: string[]
): Promise<ApplyReport> {
  const context = getRunContext(runId);

  if (!context) {
    throw new Error("Run context not found. Analyze the repository first.");
  }

  const selectedFixes =
    selectedFixIds && selectedFixIds.length > 0
      ? context.report.recommendedFixes.filter((fix) => selectedFixIds.includes(fix.id))
      : context.report.recommendedFixes;

  if (selectedFixes.length === 0) {
    throw new Error("No fixes selected for optimization.");
  }

  const optimizedPath = path.join(context.workspacePath, "optimized");
  const hasSourceRepo = await directoryExists(context.sourcePath);

  if (hasSourceRepo) {
    await createOptimizedCopy(context.sourcePath, optimizedPath);
  } else {
    const { mkdir } = await import("node:fs/promises");
    await mkdir(optimizedPath, { recursive: true });
  }

  await applyFixes(optimizedPath, selectedFixes);

  if (hasSourceRepo) {
    await installDependencies(optimizedPath);
  }

  let postStatic: StaticAnalysisResult = {
    findings: [],
    snapshot: context.report.snapshot ?? {
      framework: "Unknown",
      hasRobots: false,
      hasSitemap: false,
      hasMetadataFile: false,
      routeCount: 0
    },
    seoScoreContribution: 0
  };

  const validation = hasSourceRepo
    ? await runValidation(optimizedPath)
    : [{ name: "repo-check", success: true, output: "No repository to validate — site-only analysis." }];

  if (hasSourceRepo) {
    postStatic = await runStaticAnalysis(optimizedPath);
  }

  let branchName = "n/a";
  let commitHash: string | undefined;

  if (hasSourceRepo) {
    branchName = await createBranch(optimizedPath, runId);
    commitHash = await createCommit(
      optimizedPath,
      "chore(seo-geo): apply verified optimization bundle"
    );
  }

  const updatedScores = scoreAfterFixes(context.report.baselineScores, postStatic, selectedFixes);

  const deployHint = hasSourceRepo
    ? "Deploy from the optimized directory or open a PR from the generated branch for review."
    : "Fix files have been generated. Integrate them into your project manually.";

  const CLEANUP_DELAY_MS = 5 * 60 * 1000;
  setTimeout(() => {
    cleanupWorkspace(runId).catch((err) =>
      console.error(`[cleanup] failed for run ${runId}:`, err)
    );
  }, CLEANUP_DELAY_MS);

  return {
    runId,
    status: "optimized",
    optimizedRepositoryPath: optimizedPath,
    branchName,
    commitHash,
    deployHint,
    appliedFixes: selectedFixes,
    validation,
    updatedScores
  };
}
