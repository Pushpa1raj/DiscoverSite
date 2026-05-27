const PRIVATE_IP_PATTERNS = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
  /^::1$/,
  /^fc00:/i,
  /^fe80:/i,
  /^fd/i,
];

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "0.0.0.0",
  "[::1]",
  "metadata.google.internal",
  "metadata",
]);

const ALLOWED_REPO_HOSTS = new Set([
  "github.com",
  "gitlab.com",
  "bitbucket.org",
]);

function isPrivateIp(hostname: string): boolean {
  return PRIVATE_IP_PATTERNS.some((pattern) => pattern.test(hostname));
}

export function validatePublicUrl(rawUrl: string): { valid: boolean; error?: string } {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { valid: false, error: "Invalid URL format" };
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return { valid: false, error: "Only HTTP and HTTPS URLs are allowed" };
  }

  const hostname = parsed.hostname.toLowerCase();

  if (BLOCKED_HOSTNAMES.has(hostname)) {
    return { valid: false, error: "URL points to a blocked host" };
  }

  if (isPrivateIp(hostname)) {
    return { valid: false, error: "URL points to a private or reserved IP address" };
  }

  if (!parsed.hostname || parsed.hostname.length === 0) {
    return { valid: false, error: "URL must contain a valid hostname" };
  }

  return { valid: true };
}

export function validateRepositoryUrl(rawUrl: string): { valid: boolean; error?: string } {
  const publicCheck = validatePublicUrl(rawUrl);
  if (!publicCheck.valid) {
    return publicCheck;
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { valid: false, error: "Invalid URL format" };
  }

  if (parsed.protocol !== "https:") {
    return { valid: false, error: "Repository URL must use HTTPS" };
  }

  const hostname = parsed.hostname.toLowerCase();
  if (!ALLOWED_REPO_HOSTS.has(hostname)) {
    return {
      valid: false,
      error: `Repository host '${hostname}' is not allowed. Accepted hosts: ${[...ALLOWED_REPO_HOSTS].join(", ")}`
    };
  }

  return { valid: true };
}
