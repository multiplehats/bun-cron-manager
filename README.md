# 🚀 Bun Cron Manager

A modern, extensible, and type-safe cron job manager built with [Bun](https://bun.sh) and [Croner](https://github.com/hexagon/croner). Deploy your scheduled tasks in minutes with a password protected web dashboard for simple monitoring.

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/wvIRLL?referralCode=4aYc_g&utm_medium=integration&utm_source=template&utm_campaign=generic)

Railway is a singular platform to deploy your infrastructure stack. Railway will host your infrastructure so you don't have to deal with configuration, while allowing you to vertically and horizontally scale it. By deploying Bun Cron Manager on Railway, you are one step closer to supporting a complete full-stack application with minimal burden. Host your servers, databases, AI agents, and more on [Railway](https://railway.com/deploy/wvIRLL?referralCode=4aYc_g&utm_medium=integration&utm_source=template&utm_campaign=generic).

## ✨ Features

- **Modern Stack**: Built with Bun for fast performance
- **Powerful Scheduling**: Uses Croner - the most feature-rich cron library
- **Type-Safe**: Full TypeScript support with comprehensive types
- **Secure by Default**: Multiple layers of security (see [Security Guide](SECURITY.md))
  - HTTP Basic Authentication + optional API Key authentication
  - Rate limiting to prevent abuse
  - HTTPS enforcement in production
  - Security headers (CSP, X-Frame-Options, etc.)
  - Input validation and sanitization
  - Audit logging for all security events
- **Job Control**: Pause, resume, trigger, and monitor jobs in real-time
- **Execution History**: Track job runs with success/failure metrics
- **Over-run Protection**: Prevent jobs from overlapping
- **Error Handling**: Built-in error catching and logging
- **Timezone Support**: Schedule jobs in any timezone
- **Health Checks**: Railway-ready with health check endpoints
- **Easy to Extend**: Simple job registration system
- **Lightweight**: Minimal dependencies

## 🎯 Quick Start

### Local Development

```bash
# Clone the repository
git clone <your-repo-url>
cd bun-cron-manager

# Install dependencies
bun install

# Copy environment variables
cp .env.example .env

# Start the server (with hot reload)
bun dev
```

Visit http://localhost:3000 to see the dashboard!

### Deploy to Railway

1. Click the "Deploy on Railway" button above
2. Set your environment variables (see Configuration section below)
3. Deploy!

Railway will automatically:
- Install Bun
- Install dependencies
- Start your cron manager
- Set up health checks

#### Generating a Public URL

After deployment, you'll need to generate a public URL to access the dashboard:

**Using the Railway Dashboard:**
1. Go to your project in Railway
2. Click on your service
3. Navigate to the "Settings" tab
4. Scroll to "Networking" section
5. Click "Generate Domain"

**Using the Railway CLI:**
```bash
# Install Railway CLI if you haven't already
npm i -g @railway/cli

# Login to Railway
railway login

# Link to your project
railway link

# Generate a public domain
railway domain
```

Your dashboard will now be accessible at the generated URL (e.g., `https://your-app.up.railway.app`)

## 📋 Creating Jobs

Creating a new job is incredibly simple:

### 1. Create a job file

Create a new file in `src/jobs/examples/` (or your own directory):

```typescript
// src/jobs/examples/my-awesome-job.ts
import type { JobConfig } from "../../types";

export const myAwesomeJob: JobConfig = {
  name: "my-awesome-job",
  description: "Does something awesome every hour",
  pattern: "0 * * * *", // Every hour
  timezone: "America/New_York", // Optional
  enabled: true, // Optional, defaults to true
  handler: async () => {
    // Your job logic here
    console.log("Doing awesome stuff!");

    // Async operations are fully supported
    const data = await fetch("https://api.example.com/data");
    console.log("Fetched data:", data);
  },
};
```

### 2. Register the job

Add your job to `src/jobs/index.ts`:

```typescript
import { myAwesomeJob } from "./examples/my-awesome-job";

export const jobs: JobConfig[] = [
  // ... existing jobs
  myAwesomeJob,
];
```

That's it! Your job is now registered and will start running automatically.

## 📅 Cron Pattern Syntax

Croner supports powerful cron expressions with an optional seconds field:

```
 ┌────────────── second (0-59, optional)
 │ ┌──────────── minute (0-59)
 │ │ ┌────────── hour (0-23)
 │ │ │ ┌──────── day of month (1-31)
 │ │ │ │ ┌────── month (1-12 or JAN-DEC)
 │ │ │ │ │ ┌──── day of week (0-7 or SUN-SAT)
 │ │ │ │ │ │
 * * * * * *
```

### Examples

```typescript
"*/5 * * * * *"     // Every 5 seconds
"0 */15 * * * *"    // Every 15 minutes
"0 0 * * * *"       // Every hour
"0 0 0 * * *"       // Every day at midnight
"0 0 9 * * 1-5"     // Weekdays at 9 AM
"0 0 0 1 * *"       // First day of every month
"0 0 0 * * 0"       // Every Sunday
```

### Predefined Patterns

```typescript
"@yearly"    // Run once a year  (0 0 1 1 *)
"@monthly"   // Run once a month (0 0 1 * *)
"@weekly"    // Run once a week  (0 0 * * 0)
"@daily"     // Run once a day   (0 0 * * *)
"@hourly"    // Run once an hour (0 * * * *)
```

## 🎛️ API Endpoints

The server exposes a REST API for job management:

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/` | GET | Web dashboard | ✅ Yes |
| `/health` | GET | Health check endpoint | ❌ No |
| `/api/jobs` | GET | List all jobs | ✅ Yes |
| `/api/jobs/:name` | GET | Get specific job details | ✅ Yes |
| `/api/jobs/:name/trigger` | POST | Manually trigger a job | ✅ Yes |
| `/api/jobs/:name/pause` | POST | Pause a job | ✅ Yes |
| `/api/jobs/:name/resume` | POST | Resume a paused job | ✅ Yes |
| `/api/stats` | GET | Get manager statistics | ✅ Yes |
| `/api/audit` | GET | Get audit logs (security events) | ✅ Yes |

### Example API Usage

All API endpoints require HTTP Basic Authentication. Include your credentials in the requests:

```bash
# Set your credentials
USERNAME="admin"
PASSWORD="your-password"

# Get all jobs
curl -u $USERNAME:$PASSWORD http://localhost:3000/api/jobs

# Trigger a job
curl -u $USERNAME:$PASSWORD -X POST http://localhost:3000/api/jobs/example-cron-job/trigger

# Pause a job
curl -u $USERNAME:$PASSWORD -X POST http://localhost:3000/api/jobs/example-cron-job/pause

# Resume a job
curl -u $USERNAME:$PASSWORD -X POST http://localhost:3000/api/jobs/example-cron-job/resume

# Get statistics
curl -u $USERNAME:$PASSWORD http://localhost:3000/api/stats

# Health check (no authentication required)
curl http://localhost:3000/health
```

## ⚙️ Configuration

Configure the cron manager using environment variables:

```bash
# Server Configuration
PORT=3000                    # Server port (default: 3000)
NODE_ENV=production          # Environment (development/production)

# Timezone Configuration
TIMEZONE=UTC                 # Default timezone for jobs (default: UTC)

# Job Configuration
MAX_EXECUTION_LOGS=100       # Number of execution logs to keep (default: 100)
```

### 🔐 Security Configuration

**Required - Authentication:**

```bash
DASHBOARD_USERNAME=admin                          # Your dashboard username
DASHBOARD_PASSWORD=                               # Your dashboard password (REQUIRED)
```

**Optional - Additional Security:**

```bash
# API Key Authentication (alternative to Basic Auth)
API_KEY=                                          # Optional API key for Bearer token auth

# HTTPS Enforcement (recommended for production)
REQUIRE_HTTPS=true                                # Reject non-HTTPS requests (default: false)

# Rate Limiting (prevent abuse)
RATE_LIMIT_MAX=100                                # Max requests per window (default: 100)
RATE_LIMIT_WINDOW=60                              # Time window in seconds (default: 60)

# Security Headers
ENABLE_SECURITY_HEADERS=true                      # Enable security headers (default: true)
```

**Generate a secure password:**

```bash
# Using Bun (recommended)
bun -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Using OpenSSL
openssl rand -base64 32
```

**Generate a secure API key:**

```bash
# Using Bun
bun -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Important Security Notes:**
- 🔒 **Always set a strong password** before deploying to production
- 🛡️ Read the [Security Guide](SECURITY.md) for detailed security information
- ⚠️ The server will refuse to start in production with a weak password
- 🔑 Use API keys for programmatic access (CI/CD, automation)
- 🌐 Enable `REQUIRE_HTTPS=true` in production
- 📊 Monitor `/api/audit` for security events

## 🎨 Example Jobs Included

The template comes with an example job to get you started:

1. **Example Cron Job** (`example-cron-job`) - A simple cron job that runs every minute and logs the current time to the console.

## 🏗️ Project Structure

```
bun-cron-manager/
├── src/
│   ├── index.ts              # Main server file
│   ├── cron-manager.ts       # Core CronManager class
│   ├── types.ts              # TypeScript type definitions
│   └── jobs/
│       ├── index.ts          # Job registry
│       └── examples/         # Example jobs
│           ├── health-check.ts
│           ├── data-cleanup.ts
│           ├── report-generator.ts
│           └── api-sync.ts
├── public/
│   └── index.html            # Web dashboard
├── .env.example              # Environment variables template
├── package.json              # Dependencies
├── railway.json              # Railway configuration
├── nixpacks.toml             # Nixpacks build configuration
└── README.md                 # This file
```

## 🔧 Advanced Usage

### Job Options

Jobs support all Croner options:

```typescript
export const advancedJob: JobConfig = {
  name: "advanced-job",
  description: "Advanced job with custom options",
  pattern: "0 * * * *",
  options: {
    timezone: "Europe/Stockholm",
    protect: true,              // Prevent overlapping executions
    maxRuns: 100,              // Stop after 100 runs
    catch: true,               // Catch and suppress errors
    paused: false,             // Start paused
    startAt: "2024-01-01",     // Don't run before this date
    stopAt: "2024-12-31",      // Don't run after this date
    interval: 60,              // Minimum interval between runs (seconds)
  },
  handler: async (job) => {
    // Access the Croner job instance
    console.log("Next run:", job.nextRun());
    console.log("Previous run:", job.previousRun());
    console.log("Is busy:", job.isBusy());
  },
};
```

### Programmatic Control

```typescript
import { CronManager } from "./src/cron-manager";

const manager = new CronManager();

// Register a single job
manager.register({
  name: "dynamic-job",
  description: "Dynamically added job",
  pattern: "* * * * *",
  handler: async () => {
    console.log("Dynamic job running!");
  },
});

// Control jobs
manager.trigger("health-check");
manager.pause("data-cleanup");
manager.resume("data-cleanup");
manager.stop("api-sync");

// Get job information
const job = manager.getJob("health-check");
console.log(job?.nextRun);

// Get statistics
const stats = manager.getStats();
console.log(stats);
```

## 🧪 Testing

Run tests with Bun:

```bash
bun test
```

## 🚢 Production Deployment

### Railway

Railway deployment is pre-configured:

1. Click the deploy button above
2. Configure environment variables
3. Done!

### Other Platforms

The cron manager works on any platform that supports Bun:

- **Fly.io**: Use the provided `Dockerfile` (create one if needed)
- **DigitalOcean**: Deploy as a Bun app
- **Render**: Use Bun as the build environment
- **VPS**: Install Bun and run `bun start`

## 📚 Learn More

- [Bun Documentation](https://bun.sh/docs)
- [Croner Documentation](https://github.com/hexagon/croner)
- [Cron Expression Generator](https://crontab.guru/)
- [Railway Documentation](https://docs.railway.app/)

## 🤝 Contributing

Contributions are welcome! This is a template designed to be forked and customized.

## 📄 License

MIT

## 💡 Tips

1. **Keep jobs idempotent** - Jobs should produce the same result if run multiple times
2. **Use over-run protection** - Enable `protect: true` for long-running jobs
3. **Handle errors gracefully** - Use try-catch blocks in your handlers
4. **Monitor execution times** - Check the dashboard for slow jobs
5. **Use appropriate timezones** - Set timezone per job or globally
6. **Test cron patterns** - Use [crontab.guru](https://crontab.guru/) to verify patterns
7. **Keep logs clean** - Set `MAX_EXECUTION_LOGS` to a reasonable number

## 🎉 Happy Scheduling!

Built with ❤️ using [Bun](https://bun.sh) and [Croner](https://github.com/hexagon/croner)
