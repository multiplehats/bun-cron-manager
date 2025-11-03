import React, { useState, useEffect } from "react";
import {
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Play,
  Pause,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import type { JobInfo, ManagerStats } from "./types";

export function Dashboard() {
  const [jobs, setJobs] = useState<JobInfo[]>([]);
  const [stats, setStats] = useState<ManagerStats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadJobs = async () => {
    try {
      const response = await fetch("/api/jobs");
      const data = await response.json();
      setJobs(data);
    } catch (error) {
      console.error("Failed to load jobs:", error);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch("/api/stats");
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error("Failed to load stats:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
    loadStats();

    // Auto-refresh every 10 seconds
    const interval = setInterval(() => {
      loadJobs();
      loadStats();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const handleAction = async (
    jobName: string,
    action: "trigger" | "pause" | "resume"
  ) => {
    try {
      await fetch(`/api/jobs/${jobName}/${action}`, { method: "POST" });
      setTimeout(() => {
        loadJobs();
        loadStats();
      }, 500);
    } catch (error) {
      console.error(`Failed to ${action} job:`, error);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      running: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      idle: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
      paused: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
      stopped: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    };

    const className = styles[status] || styles.idle;

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${className}`}>
        {status}
      </span>
    );
  };

  const successRate =
    stats && stats.totalExecutions > 0
      ? Math.round((stats.successfulExecutions / stats.totalExecutions) * 100)
      : 100;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading jobs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#0d0d0d]">
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-2.5 mb-1.5">
            <Activity className="h-5 w-5 text-slate-400" />
            <h1 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
              Bun Cron Manager
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Monitor and manage scheduled jobs
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="group rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111111] p-4 transition-all hover:border-slate-300 dark:hover:border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Total Jobs</span>
              <Activity className="h-3.5 w-3.5 text-slate-400" />
            </div>
            <div className="text-2xl font-semibold text-slate-900 dark:text-white mb-1">{stats?.totalJobs || 0}</div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {stats?.runningJobs || 0} running
            </p>
          </div>

          <div className="group rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111111] p-4 transition-all hover:border-slate-300 dark:hover:border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Executions</span>
              <TrendingUp className="h-3.5 w-3.5 text-slate-400" />
            </div>
            <div className="text-2xl font-semibold text-slate-900 dark:text-white mb-1">{stats?.totalExecutions || 0}</div>
            <p className="text-xs text-slate-500 dark:text-slate-400">All time</p>
          </div>

          <div className="group rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111111] p-4 transition-all hover:border-slate-300 dark:hover:border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Success Rate</span>
              <CheckCircle2 className="h-3.5 w-3.5 text-slate-400" />
            </div>
            <div className="text-2xl font-semibold text-slate-900 dark:text-white mb-1">{successRate}%</div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {stats?.successfulExecutions || 0} successful
            </p>
          </div>

          <div className="group rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111111] p-4 transition-all hover:border-slate-300 dark:hover:border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Failed</span>
              <XCircle className="h-3.5 w-3.5 text-slate-400" />
            </div>
            <div className="text-2xl font-semibold text-slate-900 dark:text-white mb-1">{stats?.failedExecutions || 0}</div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Total failures</p>
          </div>
        </div>

        {/* Jobs List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Scheduled Jobs</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Manage and monitor your cron jobs</p>
            </div>
            <button
              onClick={() => {
                loadJobs();
                loadStats();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors border border-slate-200 dark:border-slate-800"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
          </div>

          {jobs.length === 0 ? (
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111111] p-12 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">No jobs registered</p>
            </div>
          ) : (
            <div className="space-y-2">
              {jobs.map((job) => (
                <div key={job.name} className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111111] overflow-hidden transition-all hover:border-slate-300 dark:hover:border-slate-700">
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2.5">
                          <h3 className="text-base font-semibold text-slate-900 dark:text-white">{job.name}</h3>
                          {getStatusBadge(job.status)}
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{job.description}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAction(job.name, "trigger")}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 dark:bg-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 rounded-md transition-colors"
                        >
                          <Play className="h-3 w-3" />
                          Trigger
                        </button>
                        {job.status === "paused" ? (
                          <button
                            onClick={() => handleAction(job.name, "resume")}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors border border-slate-200 dark:border-slate-800"
                          >
                            <Play className="h-3 w-3" />
                            Resume
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAction(job.name, "pause")}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors border border-slate-200 dark:border-slate-800"
                          >
                            <Pause className="h-3 w-3" />
                            Pause
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                      <div>
                        <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Pattern</p>
                        <code className="text-xs font-mono text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded">
                          {job.pattern}
                        </code>
                      </div>
                      <div>
                        <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Timezone</p>
                        <p className="text-xs font-medium text-slate-900 dark:text-white">{job.timezone || "UTC"}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Next Run</p>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-slate-400" />
                          <p className="text-xs font-medium text-slate-900 dark:text-white">
                            {job.nextRun
                              ? new Date(job.nextRun).toLocaleString()
                              : "N/A"}
                          </p>
                        </div>
                      </div>
                      <div>
                        <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Previous Run</p>
                        <p className="text-xs font-medium text-slate-900 dark:text-white">
                          {job.previousRun
                            ? new Date(job.previousRun).toLocaleString()
                            : "Never"}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-8">
                      <div>
                        <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Total Runs</p>
                        <p className="text-lg font-semibold text-slate-900 dark:text-white mt-1">{job.stats.totalRuns}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Successful</p>
                        <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                          {job.stats.successfulRuns}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Failed</p>
                        <p className="text-lg font-semibold text-rose-600 dark:text-rose-400 mt-1">
                          {job.stats.failedRuns}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Avg Duration</p>
                        <p className="text-lg font-semibold text-slate-900 dark:text-white mt-1">
                          {job.stats.averageDuration}ms
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
