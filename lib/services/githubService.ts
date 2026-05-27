import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

import type { RepoSnapshot } from "@/lib/types/pipeline";

const IGNORED_DIRS = new Set([".git", "node_modules", ".next", "dist", "build"]);

async function walkFiles(root: string, current = "", acc: string[] = []): Promise<string[]> {
  const directory = path.join(root, current);
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!IGNORED_DIRS.has(entry.name)) {
        await walkFiles(root, path.join(current, entry.name), acc);
      }
      continue;
    }

    acc.push(path.join(current, entry.name));
  }

  return acc;
}

async function countRoutes(repositoryPath: string): Promise<number> {
  const appDirectory = path.join(repositoryPath, "app");
  const pagesDirectory = path.join(repositoryPath, "pages");

  let routeCount = 0;

  try {
    const appStats = await stat(appDirectory);
    if (appStats.isDirectory()) {
      const appFiles = await walkFiles(appDirectory);
      routeCount += appFiles.filter((file) => file.endsWith("page.tsx") || file.endsWith("page.jsx")).length;
    }
  } catch {
    // no-op
  }

  try {
    const pagesStats = await stat(pagesDirectory);
    if (pagesStats.isDirectory()) {
      const pageFiles = await walkFiles(pagesDirectory);
      routeCount += pageFiles.filter((file) => {
        const normalized = file.replace(/\\/g, "/");
        return (
          (normalized.endsWith(".tsx") || normalized.endsWith(".ts") || normalized.endsWith(".jsx") || normalized.endsWith(".js")) &&
          !normalized.includes("/api/") &&
          !normalized.includes("_app") &&
          !normalized.includes("_document")
        );
      }).length;
    }
  } catch {
    // no-op
  }

  return routeCount;
}

function detectFramework(files: string[]): string {
  const normalized = files.map((file) => file.replace(/\\/g, "/"));

  if (normalized.some((file) => file.endsWith("next.config.js") || file.endsWith("next.config.ts"))) {
    return "Next.js";
  }
  if (normalized.some((file) => file.endsWith("vite.config.ts") || file.endsWith("vite.config.js"))) {
    return "Vite";
  }
  if (normalized.some((file) => file.endsWith("nuxt.config.ts") || file.endsWith("nuxt.config.js"))) {
    return "Nuxt";
  }

  return "Unknown";
}

export async function inspectRepository(repositoryPath: string): Promise<RepoSnapshot> {
  const files = await walkFiles(repositoryPath);
  const normalized = files.map((file) => file.replace(/\\/g, "/"));

  const hasRobots = normalized.includes("public/robots.txt");
  const hasSitemap =
    normalized.includes("public/sitemap.xml") || normalized.includes("app/sitemap.ts") || normalized.includes("app/sitemap.js");
  const hasMetadataFile = normalized.includes("app/metadata.ts") || normalized.includes("app/layout.tsx");
  const routeCount = await countRoutes(repositoryPath);

  try {
    const packageJsonPath = path.join(repositoryPath, "package.json");
    const packageJsonRaw = await readFile(packageJsonPath, "utf8");
    const parsed = JSON.parse(packageJsonRaw) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };

    if (parsed.dependencies?.next || parsed.devDependencies?.next) {
      return {
        framework: "Next.js",
        hasRobots,
        hasSitemap,
        hasMetadataFile,
        routeCount
      };
    }
  } catch {
    // no-op
  }

  return {
    framework: detectFramework(normalized),
    hasRobots,
    hasSitemap,
    hasMetadataFile,
    routeCount
  };
}
