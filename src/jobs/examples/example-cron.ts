import type { JobConfig } from "../../types";

/**
 * Health check job - pings a URL to keep service alive
 * Useful for preventing Railway or other hosting services from sleeping
 */
export const exampleCronJob: JobConfig = {
  name: "example-cron-job",
  description: "Logs the current time every minute",
  pattern: "*/1 * * * *", // Every 1 minute
  enabled: true,
  handler: async () => {
    const now = new Date();
    console.log(`Example Cron Job executed at: ${now.toISOString()}`);
  },
};
