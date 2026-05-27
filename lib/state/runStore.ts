import type { RunContext } from "@/lib/types/pipeline";

const runStore = new Map<string, RunContext>();

export function saveRunContext(context: RunContext): void {
  runStore.set(context.report.runId, context);
}

export function getRunContext(runId: string): RunContext | undefined {
  return runStore.get(runId);
}

export function updateRunContext(runId: string, next: RunContext): void {
  runStore.set(runId, next);
}
