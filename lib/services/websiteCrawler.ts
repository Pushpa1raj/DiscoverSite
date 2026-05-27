import type { CrawlMetrics } from "@/lib/types/pipeline";

interface PageSnapshot {
  html: string;
  responseTimeMs: number;
}

function extractTagContent(html: string, pattern: RegExp): string | undefined {
  const match = html.match(pattern);
  return match?.[1]?.trim();
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
    const dynamicImport = new Function("modulePath", "return import(modulePath);") as (
      modulePath: string
    ) => Promise<any>;

    const playwright = await dynamicImport("playwright");
    const browser = await playwright.chromium.launch({
      headless: true
    });

    const page = await browser.newPage();
    const started = Date.now();
    await page.goto(siteUrl, {
      waitUntil: "networkidle",
      timeout: 60_000
    });

    const html = await page.content();
    const responseTimeMs = Date.now() - started;
    await browser.close();

    return {
      html,
      responseTimeMs
    };
  } catch {
    return undefined;
  }
}

export async function crawlWebsite(siteUrl: string): Promise<CrawlMetrics> {
  const snapshot = (await fetchSnapshotByPlaywright(siteUrl)) ?? (await fetchSnapshotByHttp(siteUrl));

  const { html, responseTimeMs } = snapshot;

  const title = extractTagContent(html, /<title[^>]*>([^<]+)<\/title>/i);
  const description = extractTagContent(
    html,
    /<meta\s+name=["']description["']\s+content=["']([^"']+)["'][^>]*>/i
  );

  const h1Count = (html.match(/<h1\b/gi) || []).length;
  const headingCount = (html.match(/<h[1-6]\b/gi) || []).length;
  const internalLinkCount = (html.match(/<a\s+[^>]*href=["']\/(?!\/)/gi) || []).length;
  const structuredDataCount = (html.match(/<script\s+type=["']application\/ld\+json["']/gi) || []).length;

  let lighthouseAvailable = false;
  let performanceScore = clampScore(100 - responseTimeMs / 40);
  let accessibilityScore = clampScore(75 + Math.min(20, headingCount * 2));

  if (process.env.ENABLE_LIGHTHOUSE === "true") {
    try {
      const dynamicImport = new Function("modulePath", "return import(modulePath);") as (
        modulePath: string
      ) => Promise<any>;

      const [{ default: lighthouse }, { launch }] = await Promise.all([
        dynamicImport("lighthouse"),
        dynamicImport("chrome-launcher")
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
    } catch {
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
