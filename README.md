# DiscoverSite

DiscoverSite is a repo-aware SEO + GEO intelligence platform built with a Next.js dashboard and server-side optimization pipeline.

## What It Implements

This project follows the architecture you specified:

1. Frontend dashboard (Next.js)
2. API gateway (auth, queue, rate limiting)
3. GitHub service (safe clone + repo parsing)
4. Website crawler (HTML scan + optional Lighthouse)
5. Static analysis engine (metadata, routes, sitemap, robots)
6. GEO AI engine (Gemma 4 via NVIDIA NIM, with fallback heuristics)
7. Fix generator (metadata, sitemap, robots, FAQ schema starter)
8. Validation engine (lint/typecheck/build checks)
9. Safe repo manager (preserve source, create optimized copy, commit branch)
10. Output layer (scores, applied fixes, validation output, deploy hint)

## Local Setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Environment Variables

Copy `.env.example` to `.env` and fill in your keys.

- `DISCOVER_API_KEY`: Optional API key for dashboard/API calls.
- `ENABLE_LIGHTHOUSE`: `true` to enable Lighthouse checks when dependencies are installed.
- `ENABLE_PLAYWRIGHT`: `true` to enable Playwright crawling.
- `NIM_API_KEY`: NVIDIA NIM API key for Gemma 4 GEO analysis.
- `NIM_BASE_URL`: Optional override (defaults to `https://integrate.api.nvidia.com/v1`).
- `NIM_MODEL`: Model override (defaults to `google/gemma-4-31b-it`).

## API Flow

### 1) Analyze

`POST /api/analyze`

Provide at least one of `repositoryUrl` or `siteUrl` (or both):

```json
{
  "repositoryUrl": "https://github.com/org/repo",
  "siteUrl": "https://example.com",
  "branch": "main"
}
```

- **Repo only**: static analysis, fix generation, repo scoring
- **Site only**: website crawling, GEO analysis, performance/accessibility scoring
- **Both**: full pipeline with all capabilities

Returns run-level findings, baseline scores, and generated fixes.

### 2) Approve Fixes

`POST /api/runs/{runId}/approve`

```json
{
  "selectedFixIds": ["fix-robots", "fix-sitemap"]
}
```

Returns optimized repo path, validation checks, applied fixes, and updated scores.

## Safety Model

- Source clone and optimized output live in isolated tmp workspace folders.
- Original repository remains unchanged.
- Fixes are applied only after explicit approval.
- Validation checks run before output is returned.

## Notes

- Lighthouse is optional and only runs when enabled with dependencies available.
- GEO engine uses NIM when configured, else deterministic fallback heuristics.
