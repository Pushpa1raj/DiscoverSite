import type { CandidateFix, Finding, RepoSnapshot } from "@/lib/types/pipeline";

interface FixGeneratorInput {
  siteUrl: string;
  snapshot: RepoSnapshot;
  findings: Finding[];
}

function ensureTrailingSlash(url: string): string {
  return url.endsWith("/") ? url : `${url}/`;
}

export function generateFixes(input: FixGeneratorInput): CandidateFix[] {
  const fixes: CandidateFix[] = [];
  const origin = new URL(input.siteUrl).origin;

  if (!input.snapshot.hasRobots || input.findings.some((finding) => finding.id === "missing-robots")) {
    const content = `User-agent: *\nAllow: /\n\nSitemap: ${ensureTrailingSlash(origin)}sitemap.xml\n`;
    fixes.push({
      id: "fix-robots",
      title: "Add crawl directives with sitemap reference",
      description: "Create a robots.txt file that explicitly allows crawl and references the sitemap.",
      targetFile: "public/robots.txt",
      patchPreview: content,
      confidence: 0.97,
      reason: "High confidence technical SEO baseline optimization.",
      content
    });
  }

  if (!input.snapshot.hasSitemap || input.findings.some((finding) => finding.id === "missing-sitemap")) {
    const content = `import type { MetadataRoute } from "next";\n\nexport default function sitemap(): MetadataRoute.Sitemap {\n  const baseUrl = "${origin}";\n\n  return [\n    {\n      url: baseUrl,\n      lastModified: new Date(),\n      changeFrequency: "weekly",\n      priority: 1\n    }\n  ];\n}\n`;

    fixes.push({
      id: "fix-sitemap",
      title: "Generate App Router sitemap",
      description: "Provide a strongly typed sitemap endpoint for search engines and AI crawlers.",
      targetFile: "app/sitemap.ts",
      patchPreview: content,
      confidence: 0.95,
      reason: "Improves discoverability with low regression risk.",
      content
    });
  }

  if (!input.snapshot.hasMetadataFile || input.findings.some((finding) => finding.id.includes("metadata"))) {
    const content = `import type { Metadata } from "next";\n\nexport const siteMetadata: Metadata = {\n  metadataBase: new URL("${origin}"),\n  title: {\n    default: "DiscoverSite Optimized Experience",\n    template: "%s | DiscoverSite"\n  },\n  description: "A technically optimized website with stronger SEO and GEO discoverability.",\n  alternates: {\n    canonical: "/"\n  },\n  openGraph: {\n    type: "website",\n    url: "${origin}",\n    title: "DiscoverSite Optimized Experience",\n    description: "A technically optimized website with stronger SEO and GEO discoverability."\n  },\n  twitter: {\n    card: "summary_large_image",\n    title: "DiscoverSite Optimized Experience",\n    description: "A technically optimized website with stronger SEO and GEO discoverability."\n  }\n};\n`;

    fixes.push({
      id: "fix-metadata-file",
      title: "Create reusable metadata config",
      description: "Add a centralized metadata export for canonical URL, OG tags, and Twitter card defaults.",
      targetFile: "app/metadata.ts",
      patchPreview: content,
      confidence: 0.89,
      reason: "Provides structured metadata baseline with minimal integration effort.",
      content
    });
  }

  if (input.findings.some((finding) => finding.id === "geo-missing-structured-data")) {
    const content = `export const faqSchema = {\n  \"@context\": \"https://schema.org\",\n  \"@type\": \"FAQPage\",\n  mainEntity: [\n    {\n      \"@type\": \"Question\",\n      name: \"What does this website provide?\",\n      acceptedAnswer: {\n        \"@type\": \"Answer\",\n        text: \"It provides trustworthy information structured for both users and AI assistants.\"\n      }\n    }\n  ]\n};\n`;

    fixes.push({
      id: "fix-faq-schema",
      title: "Add FAQ schema starter",
      description: "Create a JSON-LD FAQ schema starter that can be embedded in high-intent pages.",
      targetFile: "app/faq-schema.ts",
      patchPreview: content,
      confidence: 0.83,
      reason: "Improves semantic clarity for generative search retrieval.",
      content
    });
  }

  return fixes;
}
