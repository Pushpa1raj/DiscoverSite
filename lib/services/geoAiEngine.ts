import type { CrawlMetrics, Finding, GeoAnalysisResult, RepoSnapshot } from "@/lib/types/pipeline";

interface GeoAnalysisInput {
  siteUrl: string;
  crawl: CrawlMetrics;
  snapshot: RepoSnapshot;
  staticFindings: Finding[];
}

interface LlmGeoResponse {
  summary: string;
  geoScore: number;
  findings: Array<{
    id: string;
    title: string;
    description: string;
    severity: "low" | "medium" | "high";
  }>;
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function buildFallback(input: GeoAnalysisInput): GeoAnalysisResult {
  const findings: Finding[] = [];

  if (!input.crawl.description) {
    findings.push({
      id: "geo-missing-description",
      title: "Meta description is missing or unreadable",
      description: "AI assistants rely on concise page summaries for retrieval context.",
      severity: "high",
      source: "geo"
    });
  }

  if (input.crawl.structuredDataCount === 0) {
    findings.push({
      id: "geo-missing-structured-data",
      title: "No structured data detected",
      description: "Structured data improves entity clarity for LLM-based discovery systems.",
      severity: "medium",
      source: "geo"
    });
  }

  if (input.crawl.h1Count !== 1) {
    findings.push({
      id: "geo-heading-clarity",
      title: "Primary heading structure is weak",
      description: "A single clear H1 improves semantic focus for generative retrieval.",
      severity: "medium",
      source: "geo"
    });
  }

  const highFindings = input.staticFindings.filter((finding) => finding.severity === "high").length;
  const mediumFindings = input.staticFindings.filter((finding) => finding.severity === "medium").length;

  const geoScore = clampScore(85 - highFindings * 8 - mediumFindings * 3 - findings.length * 5);

  return {
    findings,
    geoScore,
    summary:
      "Fallback heuristic GEO analysis completed. Enable NVIDIA NIM credentials for model-based discoverability reasoning."
  };
}

/**
 * Extracts JSON from LLM response text, stripping markdown fences and thinking blocks.
 */
function extractJsonFromResponse(text: string): string {
  // Strip <think>...</think> blocks (Gemma thinking output)
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

  // Strip markdown code fences if present
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }

  return cleaned;
}

/**
 * Collects SSE stream chunks into a single complete response string.
 */
async function collectStreamResponse(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) {
    return "";
  }

  const decoder = new TextDecoder();
  let fullContent = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split("\n");

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;

      const data = line.slice(6).trim();
      if (data === "[DONE]") continue;

      try {
        const parsed = JSON.parse(data) as {
          choices?: Array<{ delta?: { content?: string } }>;
        };

        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) {
          fullContent += delta;
        }
      } catch {
        // Skip malformed SSE chunks
      }
    }
  }

  return fullContent;
}

async function runNimAnalysis(input: GeoAnalysisInput): Promise<GeoAnalysisResult | undefined> {
  const apiKey = process.env.NIM_API_KEY;
  const baseUrl = process.env.NIM_BASE_URL || "https://integrate.api.nvidia.com/v1";
  const model = process.env.NIM_MODEL || "google/gemma-4-31b-it";

  if (!apiKey) {
    return undefined;
  }

  const systemPrompt = `You are a GEO (Generative Engine Optimization) expert analyzer. Analyze the provided website and repository data to assess discoverability by AI systems (LLMs, AI search engines, generative retrieval systems).

Evaluate:
1. Content structure clarity for AI comprehension
2. Structured data presence and quality
3. Semantic HTML and heading hierarchy
4. Meta description quality for AI summarization
5. Internal linking for context connectivity
6. FAQ/knowledge-base patterns that aid retrieval

Return ONLY valid JSON (no markdown, no explanation) with this exact structure:
{
  "summary": "2-3 sentence assessment of the site's GEO readiness",
  "geoScore": <number 0-100>,
  "findings": [
    {
      "id": "unique-finding-id",
      "title": "Short finding title",
      "description": "Actionable description of the issue and its impact on AI discoverability",
      "severity": "low" | "medium" | "high"
    }
  ]
}`;

  const userPayload = {
    siteUrl: input.siteUrl,
    crawlMetrics: {
      title: input.crawl.title,
      description: input.crawl.description,
      h1Count: input.crawl.h1Count,
      headingCount: input.crawl.headingCount,
      internalLinkCount: input.crawl.internalLinkCount,
      structuredDataCount: input.crawl.structuredDataCount,
      responseTimeMs: input.crawl.responseTimeMs
    },
    repoSnapshot: input.snapshot,
    existingFindings: input.staticFindings.map((f) => ({
      id: f.id,
      title: f.title,
      severity: f.severity
    }))
  };

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "Accept": "text/event-stream"
      },
      body: JSON.stringify({
        model,
        max_tokens: 16384,
        temperature: 1.0,
        top_p: 0.95,
        stream: true,
        chat_template_kwargs: { enable_thinking: true },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: JSON.stringify(userPayload) }
        ]
      })
    });

    if (!response.ok) {
      console.error(`[geoAiEngine] NIM API returned ${response.status}: ${response.statusText}`);
      return undefined;
    }

    const fullContent = await collectStreamResponse(response);

    if (!fullContent) {
      console.error("[geoAiEngine] NIM API returned empty response");
      return undefined;
    }

    const jsonText = extractJsonFromResponse(fullContent);

    let parsed: LlmGeoResponse;
    try {
      parsed = JSON.parse(jsonText) as LlmGeoResponse;
    } catch {
      console.error("[geoAiEngine] Failed to parse LLM response as JSON:", jsonText.slice(0, 500));
      return undefined;
    }

    return {
      summary: parsed.summary || "GEO analysis completed via Gemma 4.",
      geoScore: clampScore(parsed.geoScore ?? 50),
      findings: (parsed.findings || []).map((finding) => ({
        ...finding,
        source: "geo" as const
      }))
    };
  } catch (error) {
    console.error("[geoAiEngine] NIM API call failed:", error);
    return undefined;
  }
}

export async function runGeoAnalysis(input: GeoAnalysisInput): Promise<GeoAnalysisResult> {
  const modelResult = await runNimAnalysis(input);
  if (modelResult) {
    return modelResult;
  }

  return buildFallback(input);
}
