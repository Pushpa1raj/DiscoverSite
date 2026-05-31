import type { CrawlMetrics } from "@/lib/types/pipeline";

interface PageSnapshot {
  html: string;
  responseTimeMs: number;
}


function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

async function fetchSnapshotByHttp(siteUrl: string): Promise<PageSnapshot> {
  const started = Date.now();
  const response = await fetch(siteUrl, {
    method: "GET",
    headers: {
      "user-agent": "DiscoverSiteCrawler/1.0"
    }
  });

  const html = await response.text();
  const responseTimeMs = Date.now() - started;

  return {
    html,
    responseTimeMs
  };
}

async function fetchSnapshotByPlaywright(siteUrl: string): Promise<PageSnapshot | undefined> {
  if (process.env.ENABLE_PLAYWRIGHT !== "true") {
    return undefined;
  }

  try {
    // webpackIgnore prevents Next.js from bundling this optional peer dep
    // @ts-expect-error -- playwright is an optional runtime dep, not installed in dev
    const playwright = await import(/* webpackIgnore: true */ "playwright");
    const browser = await playwright.chromium.launch({ headless: true });

    try {
      const page = await browser.newPage();
      const started = Date.now();
      await page.goto(siteUrl, { waitUntil: "networkidle", timeout: 60_000 });

      const html = await page.content();
      const responseTimeMs = Date.now() - started;

      return { html, responseTimeMs };
    } finally {
      await browser.close();
    }
  } catch (err) {
    // Gracefully degrade when playwright is not installed or navigation fails
    console.warn("[crawler] Playwright unavailable, falling back to HTTP fetch:", (err as Error).message);
    return undefined;
  }
}

export async function crawlWebsite(siteUrl: string): Promise<CrawlMetrics> {
  const snapshot = (await fetchSnapshotByPlaywright(siteUrl)) ?? (await fetchSnapshotByHttp(siteUrl));

  const { html, responseTimeMs } = snapshot;

  // Use DOM-like parsing for more robust extraction
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch?.[1]?.replace(/<[^>]+>/g, "").trim() || undefined;
  
  const descriptionMatch = html.match(/<meta[^>]*name=["']description["'][^>]*>/i);
  const description = descriptionMatch?.[0]?.match(/content=["']([^"']*)/i)?.[1] || undefined;

  const h1Count = (html.match(/<h1\b/gi) || []).length;
  const headingCount = (html.match(/<h[1-6]\b/gi) || []).length;
  const internalLinkCount = (html.match(/<a\s+[^>]*href=["']\/(?!\/)/gi) || []).length;
  const structuredDataCount = (html.match(/<script\s+type=["']application\/ld\+json["']/gi) || []).length;

  let lighthouseAvailable = false;
  let performanceScore = clampScore(100 - responseTimeMs / 40);
  let accessibilityScore = clampScore(75 + Math.min(20, headingCount * 2));

  if (process.env.ENABLE_LIGHTHOUSE === "true") {
    try {
      const [{ default: lighthouse }, { launch }] = await Promise.all([
        // @ts-expect-error -- lighthouse is an optional runtime dep
        import(/* webpackIgnore: true */ "lighthouse"),
        // @ts-expect-error -- chrome-launcher is an optional runtime dep
        import(/* webpackIgnore: true */ "chrome-launcher")
      ]);

      const chrome = await launch({ chromeFlags: ["--headless", "--no-sandbox"] });
      const result = await lighthouse(siteUrl, {
        port: chrome.port,
        output: "json",
        onlyCategories: ["performance", "accessibility"]
      });
      await chrome.kill();

      const categories = result?.lhr?.categories;
      if (categories?.performance?.score != null) {
        performanceScore = clampScore(categories.performance.score * 100);
      }
      if (categories?.accessibility?.score != null) {
        accessibilityScore = clampScore(categories.accessibility.score * 100);
      }

      lighthouseAvailable = true;
    } catch (err) {
      console.warn("[crawler] Lighthouse unavailable, using heuristic scores:", (err as Error).message);
      lighthouseAvailable = false;
    }
  }

  return {
    title,
    description,
    h1Count,
    headingCount,
    internalLinkCount,
    structuredDataCount,
    responseTimeMs,
    accessibilityScore,
    performanceScore,
    lighthouseAvailable
  };
}
