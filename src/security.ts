/**
 * Security utilities for Bun Cron Manager
 * Provides authentication, rate limiting, input validation, and audit logging
 */

// ============================================================================
// Configuration
// ============================================================================

const DASHBOARD_USERNAME = process.env.DASHBOARD_USERNAME || "admin";
const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD || "";
const API_KEY = process.env.API_KEY || "";
const REQUIRE_HTTPS = process.env.REQUIRE_HTTPS === "true";
const ENABLE_SECURITY_HEADERS = process.env.ENABLE_SECURITY_HEADERS !== "false";
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX || "100", 10);
const RATE_LIMIT_WINDOW = parseInt(process.env.RATE_LIMIT_WINDOW || "60", 10) * 1000; // Convert to ms

// ============================================================================
// Audit Logging
// ============================================================================

export enum AuditEventType {
  AUTH_SUCCESS = "AUTH_SUCCESS",
  AUTH_FAILURE = "AUTH_FAILURE",
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
  INVALID_INPUT = "INVALID_INPUT",
  JOB_TRIGGERED = "JOB_TRIGGERED",
  JOB_PAUSED = "JOB_PAUSED",
  JOB_RESUMED = "JOB_RESUMED",
  HTTPS_REQUIRED = "HTTPS_REQUIRED",
}

interface AuditEvent {
  timestamp: Date;
  type: AuditEventType;
  ip: string;
  path: string;
  details?: string;
}

class AuditLogger {
  private events: AuditEvent[] = [];
  private maxEvents = 1000; // Keep last 1000 events

  log(type: AuditEventType, req: Request, details?: string) {
    const ip = this.getClientIP(req);
    const path = new URL(req.url).pathname;

    const event: AuditEvent = {
      timestamp: new Date(),
      type,
      ip,
      path,
      details,
    };

    this.events.push(event);

    // Keep only the last maxEvents
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }

    // Log to console for monitoring
    const emoji = this.getEventEmoji(type);
    console.log(
      `${emoji} [${event.timestamp.toISOString()}] ${type} - ${ip} ${path}${
        details ? ` - ${details}` : ""
      }`
    );
  }

  private getEventEmoji(type: AuditEventType): string {
    const emojiMap: Record<AuditEventType, string> = {
      [AuditEventType.AUTH_SUCCESS]: "✓",
      [AuditEventType.AUTH_FAILURE]: "✗",
      [AuditEventType.RATE_LIMIT_EXCEEDED]: "⚠",
      [AuditEventType.INVALID_INPUT]: "⚠",
      [AuditEventType.JOB_TRIGGERED]: "▶",
      [AuditEventType.JOB_PAUSED]: "⏸",
      [AuditEventType.JOB_RESUMED]: "▶",
      [AuditEventType.HTTPS_REQUIRED]: "🔒",
    };
    return emojiMap[type] || "•";
  }

  private getClientIP(req: Request): string {
    // Try common headers set by proxies
    const forwardedFor = req.headers.get("x-forwarded-for");
    if (forwardedFor) {
      return forwardedFor.split(",").at(0)?.trim() ?? "unknown";
    }

    const realIP = req.headers.get("x-real-ip");
    if (realIP) {
      return realIP;
    }

    // Fallback to "unknown" for Bun.serve (doesn't expose socket info easily)
    return "unknown";
  }

  getRecentEvents(limit = 100): AuditEvent[] {
    return this.events.slice(-limit);
  }

  getEventsByType(type: AuditEventType, limit = 100): AuditEvent[] {
    return this.events.filter((e) => e.type === type).slice(-limit);
  }
}

export const auditLogger = new AuditLogger();

// ============================================================================
// Rate Limiting
// ============================================================================

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private requests = new Map<string, RateLimitEntry>();
  private cleanupInterval: Timer;

  constructor() {
    // Clean up old entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  check(req: Request): boolean {
    const ip = this.getClientIP(req);
    const now = Date.now();
    const entry = this.requests.get(ip);

    // No entry or window has passed
    if (!entry || now > entry.resetTime) {
      this.requests.set(ip, {
        count: 1,
        resetTime: now + RATE_LIMIT_WINDOW,
      });
      return true;
    }

    // Increment counter
    entry.count++;

    // Check if limit exceeded
    if (entry.count > RATE_LIMIT_MAX) {
      return false;
    }

    return true;
  }

  private getClientIP(req: Request): string {
    const forwardedFor = req.headers.get("x-forwarded-for");
    if (forwardedFor) {
      return forwardedFor.split(",").at(0)?.trim() ?? "unknown";
    }
    return req.headers.get("x-real-ip") || "unknown";
  }

  private cleanup() {
    const now = Date.now();
    for (const [ip, entry] of this.requests.entries()) {
      if (now > entry.resetTime) {
        this.requests.delete(ip);
      }
    }
  }

  stop() {
    clearInterval(this.cleanupInterval);
  }
}

export const rateLimiter = new RateLimiter();

// ============================================================================
// Input Validation
// ============================================================================

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export function validateJobName(name: string): void {
  if (!name) {
    throw new ValidationError("Job name is required");
  }

  // Allow alphanumeric, dash, underscore, and dot
  const validPattern = /^[a-zA-Z0-9\-_.]+$/;
  if (!validPattern.test(name)) {
    throw new ValidationError(
      "Job name can only contain letters, numbers, dashes, underscores, and dots"
    );
  }

  // Reasonable length limit
  if (name.length > 100) {
    throw new ValidationError("Job name must be 100 characters or less");
  }

  // Prevent path traversal attempts
  if (name.includes("..") || name.includes("/") || name.includes("\\")) {
    throw new ValidationError("Job name contains invalid characters");
  }
}

// ============================================================================
// Authentication
// ============================================================================

export enum AuthMethod {
  BASIC = "basic",
  API_KEY = "api_key",
  NONE = "none",
}

interface AuthResult {
  success: boolean;
  method?: AuthMethod;
  username?: string;
}

export function requireAuth(req: Request): Response | null {
  const authHeader = req.headers.get("Authorization");

  if (!authHeader) {
    return createUnauthorizedResponse();
  }

  let authResult: AuthResult;

  // Try API Key authentication first (if configured)
  if (API_KEY && authHeader.startsWith("Bearer ")) {
    authResult = authenticateWithAPIKey(authHeader);
  }
  // Try HTTP Basic Auth
  else if (authHeader.startsWith("Basic ")) {
    authResult = authenticateWithBasic(authHeader);
  } else {
    return createUnauthorizedResponse();
  }

  if (!authResult.success) {
    auditLogger.log(AuditEventType.AUTH_FAILURE, req, authResult.method);
    return createUnauthorizedResponse();
  }

  auditLogger.log(
    AuditEventType.AUTH_SUCCESS,
    req,
    `${authResult.method}${authResult.username ? ` (${authResult.username})` : ""}`
  );

  return null; // Auth successful
}

function authenticateWithBasic(authHeader: string): AuthResult {
  try {
    const base64Credentials = authHeader.slice(6); // Remove "Basic "
    const credentials = atob(base64Credentials);
    const [username, password] = credentials.split(":");

    if (username === DASHBOARD_USERNAME && password === DASHBOARD_PASSWORD) {
      return { success: true, method: AuthMethod.BASIC, username };
    }

    return { success: false, method: AuthMethod.BASIC };
  } catch (error) {
    return { success: false, method: AuthMethod.BASIC };
  }
}

function authenticateWithAPIKey(authHeader: string): AuthResult {
  const providedKey = authHeader.slice(7); // Remove "Bearer "

  if (providedKey === API_KEY) {
    return { success: true, method: AuthMethod.API_KEY };
  }

  return { success: false, method: AuthMethod.API_KEY };
}

function createUnauthorizedResponse(): Response {
  return new Response(
    JSON.stringify({
      error: "Unauthorized",
      message: "Invalid or missing authentication credentials",
    }),
    {
      status: 401,
      headers: {
        "Content-Type": "application/json",
        "WWW-Authenticate": 'Basic realm="Bun Cron Manager"',
      },
    }
  );
}

// ============================================================================
// HTTPS Enforcement
// ============================================================================

export function requireHTTPS(req: Request): Response | null {
  if (!REQUIRE_HTTPS) {
    return null;
  }

  // Check if request is over HTTPS
  const url = new URL(req.url);
  const protocol = req.headers.get("x-forwarded-proto") || url.protocol;

  if (protocol !== "https:") {
    auditLogger.log(AuditEventType.HTTPS_REQUIRED, req);
    return new Response(
      JSON.stringify({
        error: "HTTPS Required",
        message: "This service requires HTTPS. Please use https:// instead of http://",
      }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  return null;
}

// ============================================================================
// Security Headers
// ============================================================================

export function addSecurityHeaders(response: Response): Response {
  if (!ENABLE_SECURITY_HEADERS) {
    return response;
  }

  const headers = new Headers(response.headers);

  // Prevent clickjacking
  headers.set("X-Frame-Options", "DENY");

  // Prevent MIME type sniffing
  headers.set("X-Content-Type-Options", "nosniff");

  // Enable XSS protection (legacy, but doesn't hurt)
  headers.set("X-XSS-Protection", "1; mode=block");

  // Referrer policy
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Content Security Policy (restrictive for security)
  headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:;"
  );

  // Prevent browser from caching sensitive responses
  if (response.headers.get("Content-Type")?.includes("application/json")) {
    headers.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
    headers.set("Pragma", "no-cache");
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

// ============================================================================
// Secure Error Responses
// ============================================================================

export function createErrorResponse(
  error: unknown,
  includeDetails = false
): Response {
  let statusCode = 500;
  let errorMessage = "Internal server error";
  let errorType = "ServerError";

  if (error instanceof ValidationError) {
    statusCode = 400;
    errorMessage = error.message;
    errorType = "ValidationError";
  }

  const responseBody: {
    error: string;
    message: string;
    details?: string;
  } = {
    error: errorType,
    message: errorMessage,
  };

  // Only include error details in development mode
  if (includeDetails && process.env.NODE_ENV === "development") {
    responseBody.details = error instanceof Error ? error.message : String(error);
  }

  return new Response(JSON.stringify(responseBody), {
    status: statusCode,
    headers: { "Content-Type": "application/json" },
  });
}

// ============================================================================
// Middleware Composer
// ============================================================================

export type SecurityMiddleware = (req: Request) => Response | null;

/**
 * Chains multiple security middleware functions
 * Returns the first non-null response (error response) or null if all pass
 */
export function applySecurityMiddleware(
  req: Request,
  ...middlewares: SecurityMiddleware[]
): Response | null {
  for (const middleware of middlewares) {
    const response = middleware(req);
    if (response) {
      return response;
    }
  }
  return null;
}

// ============================================================================
// Rate Limit Middleware
// ============================================================================

export function requireRateLimit(req: Request): Response | null {
  if (!rateLimiter.check(req)) {
    auditLogger.log(AuditEventType.RATE_LIMIT_EXCEEDED, req);
    return new Response(
      JSON.stringify({
        error: "Rate Limit Exceeded",
        message: `Too many requests. Maximum ${RATE_LIMIT_MAX} requests per ${RATE_LIMIT_WINDOW / 1000} seconds.`,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(Math.ceil(RATE_LIMIT_WINDOW / 1000)),
        },
      }
    );
  }
  return null;
}

// ============================================================================
// Startup Validation
// ============================================================================

export function validateSecurityConfig() {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Check for default or weak passwords
  if (
    !DASHBOARD_PASSWORD ||
    DASHBOARD_PASSWORD === "change-this-password" ||
    DASHBOARD_PASSWORD === "change-this-password-to-something-secure" ||
    DASHBOARD_PASSWORD.length < 8
  ) {
    if (process.env.NODE_ENV === "production") {
      errors.push(
        "❌ SECURITY ERROR: Weak or default password detected in production!"
      );
      errors.push(
        "   Set a strong DASHBOARD_PASSWORD in your environment variables."
      );
      errors.push(
        '   Generate one with: bun -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"'
      );
    } else {
      warnings.push(
        "⚠️  WARNING: Weak or default password detected. Please set DASHBOARD_PASSWORD before deploying."
      );
    }
  }

  // Check HTTPS in production
  if (process.env.NODE_ENV === "production" && !REQUIRE_HTTPS) {
    warnings.push(
      "⚠️  WARNING: HTTPS enforcement is disabled in production. Set REQUIRE_HTTPS=true to enhance security."
    );
  }

  // Log configuration
  console.log("\n🔒 Security Configuration:");
  console.log(`   Authentication: HTTP Basic Auth${API_KEY ? " + API Key" : ""}`);
  console.log(
    `   Rate Limiting: ${RATE_LIMIT_MAX} requests per ${RATE_LIMIT_WINDOW / 1000}s`
  );
  console.log(`   HTTPS Required: ${REQUIRE_HTTPS}`);
  console.log(`   Security Headers: ${ENABLE_SECURITY_HEADERS}`);

  // Print warnings
  if (warnings.length > 0) {
    console.log("");
    warnings.forEach((w) => console.log(w));
  }

  // Print errors and exit if in production
  if (errors.length > 0) {
    console.log("");
    errors.forEach((e) => console.error(e));
    if (process.env.NODE_ENV === "production") {
      console.error("\nExiting due to security errors...\n");
      process.exit(1);
    }
  }

  console.log("");
}
