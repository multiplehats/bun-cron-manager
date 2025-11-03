import type { Cron, CronOptions } from "croner";

/**
 * Job execution status
 */
export type JobStatus = "running" | "paused" | "stopped" | "idle";

/**
 * Job execution result
 */
export interface JobExecution {
  jobName: string;
  startTime: Date;
  endTime?: Date;
  duration?: number; // in milliseconds
  success: boolean;
  error?: string;
  output?: string;
}

/**
 * Job configuration
 */
export interface JobConfig {
  name: string;
  description: string;
  pattern: string;
  timezone?: string;
  enabled?: boolean;
  options?: Partial<CronOptions>;
  handler: (job: Cron) => Promise<void> | void;
}

/**
 * Job information for API responses
 */
export interface JobInfo {
  name: string;
  description: string;
  pattern: string;
  timezone?: string;
  enabled: boolean;
  status: JobStatus;
  nextRun: Date | null;
  previousRun: Date | null;
  currentRun: Date | null;
  isBusy: boolean;
  executions: JobExecution[];
  stats: {
    totalRuns: number;
    successfulRuns: number;
    failedRuns: number;
    averageDuration: number;
  };
}

/**
 * Manager statistics
 */
export interface ManagerStats {
  totalJobs: number;
  runningJobs: number;
  pausedJobs: number;
  stoppedJobs: number;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
}
