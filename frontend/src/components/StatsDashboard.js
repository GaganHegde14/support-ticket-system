import React, { useState, useEffect, useCallback } from "react";
import { fetchStats } from "../api";

export default function StatsDashboard({ refreshKey }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await fetchStats();
      setStats(data);
    } catch {
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [refreshKey]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <div className="card"><p className="loading-text">⏳ Loading stats…</p></div>;
  if (!stats) return <div className="card"><p className="empty-text">Unable to load statistics.</p></div>;

  const maxPriority = Math.max(1, ...Object.values(stats.priority_breakdown || {}));
  const maxCategory = Math.max(1, ...Object.values(stats.category_breakdown || {}));

  const priorityColors = {
    critical: "linear-gradient(90deg, #dc2626, #ef4444)",
    high: "linear-gradient(90deg, #ef4444, #f87171)",
    medium: "linear-gradient(90deg, #f59e0b, #fbbf24)",
    low: "linear-gradient(90deg, #10b981, #34d399)",
  };

  return (
    <div className="card">
      <h2>Dashboard</h2>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.total_tickets}</div>
          <div className="stat-label">Total</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.open_tickets}</div>
          <div className="stat-label">Open</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.avg_tickets_per_day}</div>
          <div className="stat-label">Avg / Day</div>
        </div>
      </div>

      {/* Priority Breakdown */}
      <div className="breakdown-section">
        <h4>Priority Breakdown</h4>
        {Object.entries(stats.priority_breakdown || {}).map(([key, val]) => (
          <div className="breakdown-bar" key={key}>
            <span className="bar-label">{key}</span>
            <div className="bar-track">
              <div
                className="bar-fill"
                style={{
                  width: `${(val / maxPriority) * 100}%`,
                  background: priorityColors[key] || "linear-gradient(90deg, #6366f1, #a78bfa)",
                }}
              />
            </div>
            <span className="bar-count">{val}</span>
          </div>
        ))}
      </div>

      {/* Category Breakdown */}
      <div className="breakdown-section">
        <h4>Category Breakdown</h4>
        {Object.entries(stats.category_breakdown || {}).map(([key, val]) => (
          <div className="breakdown-bar" key={key}>
            <span className="bar-label">{key}</span>
            <div className="bar-track">
              <div
                className="bar-fill"
                style={{ width: `${(val / maxCategory) * 100}%` }}
              />
            </div>
            <span className="bar-count">{val}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
