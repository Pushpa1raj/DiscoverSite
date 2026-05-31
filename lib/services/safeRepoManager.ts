import { access, mkdir, cp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import type { CandidateFix } from "@/lib/types/pipeline";
import { runCommand } from "@/lib/services/command";

export interface WorkspacePaths {
  workspacePath: string;
  sourcePath: string;
  optimizedPath: string;
}

export async function createRunWorkspace(runId: string): Promise<WorkspacePaths> {
  const workspacePath = path.join(tmpdir(), "discoversite-runs", runId);
  const sourcePath = path.join(workspacePath, "source");
  const optimizedPath = path.join(workspacePath, "optimized");

  await mkdir(workspacePath, { recursive: true });

  return {
    workspacePath,
    sourcePath,
    optimizedPath
  };
}

export async function cloneRepository(
  repositoryUrl: string,
  destinationPath: string,
  branch?: string
): Promise<void> {
  const args = ["clone", "--depth", "1"];

  if (branch) {
    args.push("--branch", branch);
  }

  args.push(repositoryUrl, destinationPath);

  await runCommand("git", args);
}

export async function createOptimizedCopy(
  sourcePath: string,
  optimizedPath: string
): Promise<void> {
  await rm(optimizedPath, { recursive: true, force: true });
  await cp(sourcePath, optimizedPath, {
    recursive: true,
    force: true
  });
}

export async function applyFixes(
  optimizedPath: string,
  fixes: CandidateFix[]
): Promise<void> {
  const safeRoot = path.resolve(optimizedPath) + path.sep;

  for (const fix of fixes) {
    const filePath = path.resolve(path.join(optimizedPath, fix.targetFile));

    if (!filePath.startsWith(safeRoot)) {
      throw new Error(`Path traversal detected in fix target: ${fix.id}`);
    }

    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, fix.content, "utf8");
  }
}

export async function createBranch(optimizedPath: string, runId: string): Promise<string> {
  const branchName = `codex/geo-seo-${runId.slice(0, 8)}`;
  await runCommand("git", ["-C", optimizedPath, "checkout", "-b", branchName]);
  return branchName;
}

export async function createCommit(
  optimizedPath: string,
  commitMessage: string
): Promise<string | undefined> {
  await runCommand("git", ["-C", optimizedPath, "config", "user.name", "DiscoverSite Bot"]);
  await runCommand("git", ["-C", optimizedPath, "config", "user.email", "bot@discoversite.local"]);
  await runCommand("git", ["-C", optimizedPath, "add", "."]);

  try {
    await runCommand("git", ["-C", optimizedPath, "commit", "-m", commitMessage]);
  } catch {
    return undefined;
  }

  const { stdout } = await runCommand("git", ["-C", optimizedPath, "rev-parse", "HEAD"]);
  return stdout.trim();
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function installDependencies(repositoryPath: string): Promise<void> {
  if (await fileExists(path.join(repositoryPath, "pnpm-lock.yaml"))) {
    await runCommand("pnpm", ["install", "--frozen-lockfile"], repositoryPath);
  } else if (await fileExists(path.join(repositoryPath, "yarn.lock"))) {
    await runCommand("yarn", ["install", "--frozen-lockfile"], repositoryPath);
  } else if (await fileExists(path.join(repositoryPath, "package.json"))) {
    await runCommand("npm", ["ci", "--ignore-scripts"], repositoryPath);
  }
}

export async function cleanupWorkspace(runId: string): Promise<void> {
  const workspacePath = path.join(tmpdir(), "discoversite-runs", runId);
  await rm(workspacePath, { recursive: true, force: true });
}
