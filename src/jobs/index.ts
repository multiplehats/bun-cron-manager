import type { JobConfig } from "../types";

// Import example jobs
import { exampleCronJob } from "./examples/example-cron.js";

/**
 * Job Registry
 *
 * Add your jobs here to register them with the CronManager.
 * Each job should implement the JobConfig interface.
 *
 * To create a new job:
 * 1. Create a new file in ./examples/ or create your own directory
 * 2. Export a JobConfig object
 * 3. Import and add it to the jobs array below
 *
 * Job configuration options:
 * - name: Unique identifier for the job
 * - description: Human-readable description
 * - pattern: Cron expression (supports seconds)
 * - timezone: Optional timezone (default: UTC)
 * - enabled: Whether the job should start automatically (default: true)
 * - options: Additional Croner options (protect, maxRuns, etc.)
 * - handler: Async function to execute
 *
 * Cron pattern format:
 * ┌────────────── second (0-59, optional)
 * │ ┌──────────── minute (0-59)
 * │ │ ┌────────── hour (0-23)
 * │ │ │ ┌──────── day of month (1-31)
 * │ │ │ │ ┌────── month (1-12 or JAN-DEC)
 * │ │ │ │ │ ┌──── day of week (0-7 or SUN-SAT)
 * │ │ │ │ │ │
 * * * * * * *
 *
 * Predefined patterns:
 * - @yearly (or @annually): Run once a year
 * - @monthly: Run once a month
 * - @weekly: Run once a week
 * - @daily: Run once a day
 * - @hourly: Run once an hour
 */
export const jobs: JobConfig[] = [
  exampleCronJob,

  // Add your custom jobs here
  // Example:
  // {
  //   name: "my-custom-job",
  //   description: "Does something awesome",
  //   pattern: "0 */6 * * *", // Every 6 hours
  //   handler: async () => {
  //     console.log("Running my custom job!");
  //   },
  // },
];
