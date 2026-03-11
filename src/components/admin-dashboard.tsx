"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { DashboardStats, EventLog } from "@/lib/queries/products";

type LogFilter = "all" | "error" | "warn" | "info";

export function AdminDashboard({
  stats,
  logs,
}: {
  stats: DashboardStats;
  logs: EventLog[];
}) {
  const [filter, setFilter] = useState<LogFilter>("all");

  const filteredLogs =
    filter === "all" ? logs : logs.filter((l) => l.level === filter);

  const statCards = [
    { label: "Total Products", value: stats.totalProducts },
    { label: "Total Users", value: stats.totalUsers },
    { label: "Total Votes", value: stats.totalVotes },
    { label: "Total Comments", value: stats.totalComments },
    { label: "Today Submissions", value: stats.todaySubmissions },
    { label: "Today Votes", value: stats.todayVotes },
  ];

  const errorCount = logs.filter((l) => l.level === "error").length;
  const warnCount = logs.filter((l) => l.level === "warn").length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {statCards.map((s) => (
          <div
            key={s.label}
            className="rounded-lg border border-border p-3 text-center"
          >
            <div className="font-mono text-2xl font-bold">{s.value}</div>
            <div className="mt-1 font-mono text-[11px] text-muted-foreground">
              {s.label}
            </div>
          </div>
        ))}
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-mono text-xs font-bold text-muted-foreground">
            Recent Logs ({filteredLogs.length})
          </h3>
          <div className="flex gap-1">
            {(["all", "error", "warn", "info"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "rounded-md px-2 py-0.5 font-mono text-[10px] transition-colors",
                  filter === f
                    ? "bg-foreground text-background"
                    : "border border-border text-muted-foreground hover:text-foreground"
                )}
              >
                {f.toUpperCase()}
                {f === "error" && errorCount > 0 && (
                  <span className="ml-1 text-red-500">({errorCount})</span>
                )}
                {f === "warn" && warnCount > 0 && (
                  <span className="ml-1 text-yellow-500">({warnCount})</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {filteredLogs.length === 0 ? (
          <p className="py-8 text-center font-mono text-xs text-muted-foreground">
            No logs found.
          </p>
        ) : (
          <div className="max-h-[500px] overflow-y-auto rounded-lg border border-border">
            <table className="w-full">
              <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                <tr className="font-mono text-[10px] text-muted-foreground">
                  <th className="px-2 py-1.5 text-left">Time</th>
                  <th className="px-2 py-1.5 text-left">Level</th>
                  <th className="px-2 py-1.5 text-left">Type</th>
                  <th className="px-2 py-1.5 text-left">Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="font-mono text-[11px]">
                    <td className="whitespace-nowrap px-2 py-1.5 text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-2 py-1.5">
                      <span
                        className={cn(
                          "inline-block rounded px-1.5 py-0.5 text-[10px] font-bold",
                          log.level === "error" &&
                            "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
                          log.level === "warn" &&
                            "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400",
                          log.level === "info" &&
                            "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400"
                        )}
                      >
                        {log.level.toUpperCase()}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-2 py-1.5 text-muted-foreground">
                      {log.type}
                    </td>
                    <td className="max-w-[300px] truncate px-2 py-1.5" title={log.message}>
                      {log.message}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
