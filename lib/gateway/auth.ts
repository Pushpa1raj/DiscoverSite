import { NextRequest } from "next/server";

export function isAuthorized(request: NextRequest): boolean {
  const expectedApiKey = process.env.DISCOVER_API_KEY;

  if (!expectedApiKey) {
    return true;
  }

  const providedApiKey = request.headers.get("x-api-key");
  return providedApiKey === expectedApiKey;
}
