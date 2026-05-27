import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function runCommand(
  command: string,
  args: string[],
  cwd?: string
): Promise<{ stdout: string; stderr: string }> {
  return execFileAsync(command, args, {
    cwd,
    timeout: 120_000,
    maxBuffer: 1024 * 1024 * 5,
    env: {
      PATH: process.env.PATH ?? "",
      HOME: process.env.HOME ?? "",
      SHELL: process.env.SHELL ?? "",
      TERM: process.env.TERM ?? "",
      LANG: process.env.LANG ?? "",
      NODE_ENV: process.env.NODE_ENV ?? "production",
      CI: "true"
    }
  });
}
