import { NextRequest, NextResponse } from "next/server";

import { isAuthorized } from "@/lib/gateway/auth";
import { pipelineQueue } from "@/lib/gateway/queue";
import { checkRateLimit } from "@/lib/gateway/rateLimiter";
import { validatePublicUrl, validateRepositoryUrl } from "@/lib/gateway/urlValidator";
import { runAnalyzePipeline } from "@/lib/orchestrator/analyzePipeline";
import type { AnalyzeRequest } from "@/lib/types/pipeline";

export const runtime = "nodejs";

function clientKey(request: NextRequest): string {
  const forward = request.headers.get("x-forwarded-for");
  if (forward) {
    return forward.split(",")[0].trim();
  }

  return request.headers.get("x-real-ip") ?? "anonymous";
}

function validateRequest(body: Partial<AnalyzeRequest>): string | null {
  if (!body.repositoryUrl && !body.siteUrl) {
    return "At least one of repositoryUrl or siteUrl is required";
  }

  if (body.repositoryUrl) {
    const repoCheck = validateRepositoryUrl(body.repositoryUrl);
    if (!repoCheck.valid) {
      return `repositoryUrl: ${repoCheck.error}`;
    }
  }

  if (body.siteUrl) {
    const siteCheck = validatePublicUrl(body.siteUrl);
    if (!siteCheck.valid) {
      return `siteUrl: ${siteCheck.error}`;
    }
  }

  return null;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
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

  let body: AnalyzeRequest;
  try {
    body = (await request.json()) as AnalyzeRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const validationError = validateRequest(body);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  try {
    const report = await pipelineQueue.enqueue(() => runAnalyzePipeline(body));
    return NextResponse.json(report);
  } catch (error) {
    console.error("[api/analyze] pipeline error:", error);
    return NextResponse.json(
      { error: "An internal error occurred. Please try again later." },
      { status: 500 }
    );
  }
}
