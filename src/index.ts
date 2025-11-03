import { CronManager } from "./cron-manager.js";
import { serve } from "bun";
import index from "./index.html";
import {
  requireAuth,
  requireHTTPS,
  requireRateLimit,
  addSecurityHeaders,
  validateJobName,
  validateSecurityConfig,
  createErrorResponse,
  applySecurityMiddleware,
  auditLogger,
  AuditEventType,
  ValidationError,
  rateLimiter,
} from "./security";
import { jobs } from "./jobs/index.js";

// Validate security configuration on startup
validateSecurityConfig();

// Initialize CronManager
const maxLogs = parseInt(process.env.MAX_EXECUTION_LOGS || "100", 10);
const manager = new CronManager(maxLogs);

// Register all jobs
console.log("🚀 Bun Cron Manager Starting...\n");
manager.registerAll(jobs);

const port = parseInt(process.env.PORT || "3000", 10);

const server = serve({
  routes: {
    // Serve index.html for all unmatched routes.
    "/*": index,

    "/health": {
      GET: (req) => {
        // health doesn't need authentication but is rate limited
        const securityError = applySecurityMiddleware(
          req,
          requireHTTPS,
          requireRateLimit
        );
        if (securityError) return addSecurityHeaders(securityError);

        const response = new Response(JSON.stringify({ status: "ok" }), {
          headers: { "Content-Type": "application/json" },
        });
        return addSecurityHeaders(response);
      },
    },

       // Get all jobs (protected with auth)
    "/api/jobs": {
      GET: (req) => {
        const securityError = applySecurityMiddleware(
          req,
          requireHTTPS,
          requireRateLimit,
          requireAuth
        );
        if (securityError) return addSecurityHeaders(securityError);

        try {
          const jobsList = manager.getAllJobs();
          const response = new Response(JSON.stringify(jobsList), {
            headers: { "Content-Type": "application/json" },
          });
          return addSecurityHeaders(response);
        } catch (error) {
          return addSecurityHeaders(createErrorResponse(error));
        }
      },
    },

    // Get specific job (protected with auth)
    "/api/jobs/:name": {
      GET: (req) => {
        const securityError = applySecurityMiddleware(
          req,
          requireHTTPS,
          requireRateLimit,
          requireAuth
        );
        if (securityError) return addSecurityHeaders(securityError);

        try {
          validateJobName(req.params.name);

          const job = manager.getJob(req.params.name);
          if (!job) {
            return addSecurityHeaders(
              new Response(JSON.stringify({ error: "Job not found" }), {
                status: 404,
                headers: { "Content-Type": "application/json" },
              })
            );
          }

          const response = new Response(JSON.stringify(job), {
            headers: { "Content-Type": "application/json" },
          });
          return addSecurityHeaders(response);
        } catch (error) {
          if (error instanceof ValidationError) {
            auditLogger.log(AuditEventType.INVALID_INPUT, req, error.message);
          }
          return addSecurityHeaders(createErrorResponse(error));
        }
      },
    },

    // Trigger a job (protected with auth)
    "/api/jobs/:name/trigger": {
      POST: (req) => {
        const securityError = applySecurityMiddleware(
          req,
          requireHTTPS,
          requireRateLimit,
          requireAuth
        );
        if (securityError) return addSecurityHeaders(securityError);

        try {
          validateJobName(req.params.name);

          const success = manager.trigger(req.params.name);

          if (success) {
            auditLogger.log(AuditEventType.JOB_TRIGGERED, req, req.params.name);
          }

          const response = new Response(
            JSON.stringify({
              success,
              message: success
                ? "Job triggered successfully"
                : "Failed to trigger job",
            }),
            {
              status: success ? 200 : 404,
              headers: { "Content-Type": "application/json" },
            }
          );
          return addSecurityHeaders(response);
        } catch (error) {
          if (error instanceof ValidationError) {
            auditLogger.log(AuditEventType.INVALID_INPUT, req, error.message);
          }
          return addSecurityHeaders(createErrorResponse(error));
        }
      },
    },

    // Pause a job (protected with auth)
    "/api/jobs/:name/pause": {
      POST: (req) => {
        const securityError = applySecurityMiddleware(
          req,
          requireHTTPS,
          requireRateLimit,
          requireAuth
        );
        if (securityError) return addSecurityHeaders(securityError);

        try {
          validateJobName(req.params.name);

          const success = manager.pause(req.params.name);

          if (success) {
            auditLogger.log(AuditEventType.JOB_PAUSED, req, req.params.name);
          }

          const response = new Response(
            JSON.stringify({
              success,
              message: success ? "Job paused successfully" : "Failed to pause job",
            }),
            {
              status: success ? 200 : 404,
              headers: { "Content-Type": "application/json" },
            }
          );
          return addSecurityHeaders(response);
        } catch (error) {
          if (error instanceof ValidationError) {
            auditLogger.log(AuditEventType.INVALID_INPUT, req, error.message);
          }
          return addSecurityHeaders(createErrorResponse(error));
        }
      },
    },

    // Resume a job (protected with auth)
    "/api/jobs/:name/resume": {
      POST: (req) => {
        const securityError = applySecurityMiddleware(
          req,
          requireHTTPS,
          requireRateLimit,
          requireAuth
        );
        if (securityError) return addSecurityHeaders(securityError);

        try {
          validateJobName(req.params.name);

          const success = manager.resume(req.params.name);

          if (success) {
            auditLogger.log(AuditEventType.JOB_RESUMED, req, req.params.name);
          }

          const response = new Response(
            JSON.stringify({
              success,
              message: success ? "Job resumed successfully" : "Failed to resume job",
            }),
            {
              status: success ? 200 : 404,
              headers: { "Content-Type": "application/json" },
            }
          );
          return addSecurityHeaders(response);
        } catch (error) {
          if (error instanceof ValidationError) {
            auditLogger.log(AuditEventType.INVALID_INPUT, req, error.message);
          }
          return addSecurityHeaders(createErrorResponse(error));
        }
      },
    },

    // Get manager statistics (protected with auth)
    "/api/stats": {
      GET: (req) => {
        const securityError = applySecurityMiddleware(
          req,
          requireHTTPS,
          requireRateLimit,
          requireAuth
        );
        if (securityError) return addSecurityHeaders(securityError);

        try {
          const stats = manager.getStats();
          const response = new Response(JSON.stringify(stats), {
            headers: { "Content-Type": "application/json" },
          });
          return addSecurityHeaders(response);
        } catch (error) {
          return addSecurityHeaders(createErrorResponse(error));
        }
      },
    },

    // Audit log endpoint (protected with auth) - NEW
    "/api/audit": {
      GET: (req) => {
        const securityError = applySecurityMiddleware(
          req,
          requireHTTPS,
          requireRateLimit,
          requireAuth
        );
        if (securityError) return addSecurityHeaders(securityError);

        try {
          const url = new URL(req.url);
          const limit = parseInt(url.searchParams.get("limit") || "100", 10);
          const events = auditLogger.getRecentEvents(limit);

          const response = new Response(JSON.stringify(events), {
            headers: { "Content-Type": "application/json" },
          });
          return addSecurityHeaders(response);
        } catch (error) {
          return addSecurityHeaders(createErrorResponse(error));
        }
      },
    },
  },

  development: process.env.NODE_ENV !== "production" && {
    // Enable browser hot reloading in development
    hmr: true,

    // Echo console logs from the browser to the server
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
