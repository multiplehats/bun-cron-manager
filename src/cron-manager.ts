import { Cron } from "croner";
import type {
  JobConfig,
  JobInfo,
  JobExecution,
  JobStatus,
  ManagerStats,
} from "./types.js";

/**
 * CronManager - A powerful, type-safe cron job manager built on Croner
 *
 * Features:
 * - Job registration and management
 * - Execution history tracking
 * - Error handling and logging
 * - Job control (pause, resume, stop, trigger)
 * - Statistics and monitoring
 */
export class CronManager {
  private jobs = new Map<string, Cron>();
  private configs = new Map<string, JobConfig>();
  private executions = new Map<string, JobExecution[]>();
  private maxExecutionLogs: number;

  constructor(maxExecutionLogs = 100) {
    this.maxExecutionLogs = maxExecutionLogs;
  }

  /**
   * Register a new cron job
   */
  register(config: JobConfig): void {
    if (this.jobs.has(config.name)) {
      throw new Error(`Job with name "${config.name}" already exists`);
    }

    // Store config
    this.configs.set(config.name, config);
    this.executions.set(config.name, []);

    // Create job if enabled
    if (config.enabled !== false) {
      this.createJob(config);
    }

    console.log(`✓ Registered job: ${config.name} (${config.pattern})`);
  }

  /**
   * Register multiple jobs at once
   */
  registerAll(configs: JobConfig[]): void {
    for (const config of configs) {
      this.register(config);
    }
  }

  /**
   * Create and start a Croner job
   */
  private createJob(config: JobConfig): void {
    const options = {
      name: config.name,
      timezone: config.timezone || process.env.TIMEZONE || "UTC",
      protect: true, // Enable over-run protection
      catch: (error: unknown) => {
        console.error(`Error in job "${config.name}":`, error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.recordExecution(config.name, false, errorMessage);
      },
      ...config.options,
    };

    const job = new Cron(config.pattern, options, async (self) => {
      const startTime = new Date();
      console.log(`→ Running job: ${config.name} at ${startTime.toISOString()}`);

      try {
        await config.handler(self);
        const endTime = new Date();
        const duration = endTime.getTime() - startTime.getTime();
        this.recordExecution(config.name, true, undefined, startTime, endTime, duration);
        console.log(`✓ Completed job: ${config.name} (${duration}ms)`);
      } catch (error) {
        const endTime = new Date();
        const duration = endTime.getTime() - startTime.getTime();
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.recordExecution(config.name, false, errorMessage, startTime, endTime, duration);
        console.error(`✗ Failed job: ${config.name} (${duration}ms):`, errorMessage);
      }
    });

    this.jobs.set(config.name, job);
  }

  /**
   * Record job execution
   */
  private recordExecution(
    jobName: string,
    success: boolean,
    error?: string,
    startTime?: Date,
    endTime?: Date,
    duration?: number
  ): void {
    const executions = this.executions.get(jobName) || [];

    const execution: JobExecution = {
      jobName,
      startTime: startTime || new Date(),
      endTime,
      duration,
      success,
      error,
    };

    executions.unshift(execution);

    // Keep only recent executions
    if (executions.length > this.maxExecutionLogs) {
      executions.length = this.maxExecutionLogs;
    }

    this.executions.set(jobName, executions);
  }

  /**
   * Get job status
   */
  private getJobStatus(job: Cron | undefined): JobStatus {
    if (!job) return "stopped";
    if (job.isStopped()) return "stopped";
    if (!job.isRunning()) return "paused";
    if (job.isBusy()) return "running";
    return "idle";
  }

  /**
   * Get information about a specific job
   */
  getJob(name: string): JobInfo | null {
    const config = this.configs.get(name);
    if (!config) return null;

    const job = this.jobs.get(name);
    const executions = this.executions.get(name) || [];

    const successfulRuns = executions.filter((e) => e.success).length;
    const failedRuns = executions.filter((e) => !e.success).length;
    const totalDuration = executions.reduce((sum, e) => sum + (e.duration || 0), 0);
    const averageDuration = executions.length > 0 ? totalDuration / executions.length : 0;

    return {
      name: config.name,
      description: config.description,
      pattern: config.pattern,
      timezone: config.timezone,
      enabled: config.enabled !== false,
      status: this.getJobStatus(job),
      nextRun: job?.nextRun() || null,
      previousRun: job?.previousRun() || null,
      currentRun: job?.currentRun() || null,
      isBusy: job?.isBusy() || false,
      executions: executions.slice(0, 10), // Return last 10 executions
      stats: {
        totalRuns: executions.length,
        successfulRuns,
        failedRuns,
        averageDuration: Math.round(averageDuration),
      },
    };
  }

  /**
   * Get all registered jobs
   */
  getAllJobs(): JobInfo[] {
    return Array.from(this.configs.keys())
      .map((name) => this.getJob(name))
      .filter((job): job is JobInfo => job !== null);
  }

  /**
   * Manually trigger a job
   */
  trigger(name: string): boolean {
    const job = this.jobs.get(name);
    if (!job) {
      console.error(`Job "${name}" not found`);
      return false;
    }
    job.trigger();
    console.log(`↻ Manually triggered job: ${name}`);
    return true;
  }

  /**
   * Pause a job
   */
  pause(name: string): boolean {
    const job = this.jobs.get(name);
    if (!job) {
      console.error(`Job "${name}" not found`);
      return false;
    }
    job.pause();
    console.log(`⏸ Paused job: ${name}`);
    return true;
  }

  /**
   * Resume a job
   */
  resume(name: string): boolean {
    const job = this.jobs.get(name);
    if (!job) {
      console.error(`Job "${name}" not found`);
      return false;
    }
    const result = job.resume();
    if (result) {
      console.log(`▶ Resumed job: ${name}`);
    }
    return result;
  }

  /**
   * Stop a job permanently
   */
  stop(name: string): boolean {
    const job = this.jobs.get(name);
    if (!job) {
      console.error(`Job "${name}" not found`);
      return false;
    }
    job.stop();
    this.jobs.delete(name);
    console.log(`⏹ Stopped job: ${name}`);
    return true;
  }

  /**
   * Get manager statistics
   */
  getStats(): ManagerStats {
    const jobs = this.getAllJobs();
    const allExecutions = Array.from(this.executions.values()).flat();

    return {
      totalJobs: jobs.length,
      runningJobs: jobs.filter((j) => j.status === "running" || j.status === "idle").length,
      pausedJobs: jobs.filter((j) => j.status === "paused").length,
      stoppedJobs: jobs.filter((j) => j.status === "stopped").length,
      totalExecutions: allExecutions.length,
      successfulExecutions: allExecutions.filter((e) => e.success).length,
      failedExecutions: allExecutions.filter((e) => !e.success).length,
    };
  }

  /**
   * Stop all jobs
   */
  stopAll(): void {
    for (const [name, job] of this.jobs.entries()) {
      job.stop();
      console.log(`⏹ Stopped job: ${name}`);
    }
    this.jobs.clear();
  }
}
