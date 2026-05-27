import { access, readFile } from "node:fs/promises";
import path from "node:path";

import { runCommand } from "@/lib/services/command";
import type { ValidationCheck } from "@/lib/types/pipeline";

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function truncateOutput(value: string): string {
  if (value.length <= 4_000) {
    return value;
  }

  return `${value.slice(0, 4_000)}\n...truncated`;
}

async function detectPackageManager(optimizedPath: string): Promise<"npm" | "pnpm" | "yarn"> {
  if (await fileExists(path.join(optimizedPath, "pnpm-lock.yaml"))) {
    return "pnpm";
  }
  if (await fileExists(path.join(optimizedPath, "yarn.lock"))) {
    return "yarn";
  }
  return "npm";
}

async function runScript(
  optimizedPath: string,
  manager: "npm" | "pnpm" | "yarn",
  scriptName: string
): Promise<ValidationCheck> {
  try {
    let result;

    if (manager === "yarn") {
      result = await runCommand("yarn", [scriptName], optimizedPath);
    } else {
      result = await runCommand(manager, ["run", scriptName, "--if-present"], optimizedPath);
    }

    return {
      name: scriptName,
      success: true,
      output: truncateOutput(result.stdout || result.stderr || "ok")
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Command failed";
    return {
      name: scriptName,
      success: false,
      output: truncateOutput(message)
    };
  }
}

export async function runValidation(optimizedPath: string): Promise<ValidationCheck[]> {
  const packageJsonPath = path.join(optimizedPath, "package.json");
  const checks: ValidationCheck[] = [];

  if (!(await fileExists(packageJsonPath))) {
    checks.push({
      name: "package.json",
      success: false,
      output: "No package.json found in repository."
    });
    return checks;
  }

  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8")) as {
    scripts?: Record<string, string>;
  };

  const scripts = packageJson.scripts ?? {};
  const packageManager = await detectPackageManager(optimizedPath);

  for (const scriptName of ["lint", "typecheck", "build"]) {
    if (scripts[scriptName]) {
      checks.push(await runScript(optimizedPath, packageManager, scriptName));
      continue;
    }

    checks.push({
      name: scriptName,
      success: true,
      output: `Skipped: script '${scriptName}' is not defined.`
    });
  }

  return checks;
}
