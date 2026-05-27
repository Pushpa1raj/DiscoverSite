import { NextRequest, NextResponse } from "next/server";

import { isAuthorized } from "@/lib/gateway/auth";
import { pipelineQueue } from "@/lib/gateway/queue";
import { checkRateLimit } from "@/lib/gateway/rateLimiter";
import { runApplyPipeline } from "@/lib/orchestrator/applyPipeline";
import type { ApplyRequest } from "@/lib/types/pipeline";

export const runtime = "nodejs";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function clientKey(request: NextRequest): string {
  const forward = request.headers.get("x-forwarded-for");
  if (forward) {
    return forward.split(",")[0].trim();
  }

  return request.headers.get("x-real-ip") ?? "anonymous";
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
): Promise<NextResponse> {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = checkRateLimit(clientKey(request));
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded", retryAfterSeconds: limit.retryAfterSeconds },
      { status: 429 }
    );
  }

  const { runId } = await params;

  if (!UUID_PATTERN.test(runId)) {
    return NextResponse.json({ error: "Invalid run ID format" }, { status: 400 });
  }

  let body: ApplyRequest = {};
  try {
    body = (await request.json()) as ApplyRequest;
  } catch {
    body = {};
  }

  try {
    const report = await pipelineQueue.enqueue(() =>
      runApplyPipeline(runId, body.selectedFixIds)
    );
    return NextResponse.json(report);
  } catch (error) {
    console.error(`[api/runs/${runId}/approve] pipeline error:`, error);
    return NextResponse.json(
      { error: "An internal error occurred. Please try again later." },
      { status: 500 }
    );
  }
}
