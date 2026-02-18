import React, { useState, useEffect, useCallback } from "react";
import { fetchTickets, updateTicket } from "../api";

const CATEGORIES = ["", "billing", "technical", "account", "general"];
const PRIORITIES = ["", "low", "medium", "high", "critical"];
const STATUSES = ["", "open", "in_progress", "resolved", "closed"];
const STATUS_OPTIONS = ["open", "in_progress", "resolved", "closed"];

const STATUS_LABELS = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
};

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function truncate(str, len = 120) {
  if (!str) return "";
  return str.length > len ? str.slice(0, len) + "…" : str;
}

export default function TicketList({ refreshKey }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    category: "",
    priority: "",
    status: "",
    search: "",
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [newStatus, setNewStatus] = useState("");
  const [updating, setUpdating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page };
      if (filters.category) params.category = filters.category;
      if (filters.priority) params.priority = filters.priority;
      if (filters.status) params.status = filters.status;
      if (filters.search) params.search = filters.search;

      const { data } = await fetchTickets(params);
      setTickets(data.results || data);
      if (data.count !== undefined) {
        setTotalPages(Math.max(1, Math.ceil(data.count / 50)));
      }
    } catch {
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [filters, page, refreshKey]);

  useEffect(() => {
    load();
  }, [load]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [filters]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleTicketClick = (ticket) => {
    setSelectedTicket(ticket);
    setNewStatus(ticket.status);
  };

  const handleStatusUpdate = async () => {
    if (!selectedTicket || newStatus === selectedTicket.status) {
      setSelectedTicket(null);
      return;
    }
    setUpdating(true);
    try {
      await updateTicket(selectedTicket.id, { status: newStatus });
      setSelectedTicket(null);
      load();
    } catch {
      // Handle silently
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="card">
      <h2>Tickets</h2>

      {/* Filters */}
      <div className="filters-bar">
        <select name="category" value={filters.category} onChange={handleFilterChange}>
          <option value="">All Categories</option>
          {CATEGORIES.filter(Boolean).map((c) => (
            <option key={c} value={c}>
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </option>
          ))}
        </select>

        <select name="priority" value={filters.priority} onChange={handleFilterChange}>
          <option value="">All Priorities</option>
          {PRIORITIES.filter(Boolean).map((p) => (
            <option key={p} value={p}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </option>
          ))}
        </select>

        <select name="status" value={filters.status} onChange={handleFilterChange}>
          <option value="">All Statuses</option>
          {STATUSES.filter(Boolean).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>

        <input
          name="search"
          placeholder="Search title & description…"
          value={filters.search}
          onChange={handleFilterChange}
        />
      </div>

      {/* Ticket List */}
      {loading ? (
        <p className="loading-text">Loading tickets…</p>
      ) : tickets.length === 0 ? (
        <p className="empty-text">No tickets found.</p>
      ) : (
        <>
          <ul className="ticket-list">
            {tickets.map((t) => (
              <li
                key={t.id}
                className="ticket-item"
                onClick={() => handleTicketClick(t)}
              >
                <div className="ticket-item-header">
                  <span className="ticket-title">{t.title}</span>
                </div>
                <p className="ticket-description">{truncate(t.description)}</p>
                <div className="ticket-meta">
                  <span className="badge badge-category">{t.category}</span>
                  <span className={`badge badge-priority-${t.priority}`}>
                    {t.priority}
                  </span>
                  <span className={`badge badge-status-${t.status}`}>
                    {STATUS_LABELS[t.status] || t.status}
                  </span>
                  <span className="ticket-time">{formatDate(t.created_at)}</span>
                </div>
              </li>
            ))}
          </ul>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="btn btn-secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Prev
              </button>
              <span>
                Page {page} of {totalPages}
              </span>
              <button
                className="btn btn-secondary"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Status Update Modal */}
      {selectedTicket && (
        <div className="modal-overlay" onClick={() => setSelectedTicket(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Update Status</h3>
            <p style={{ marginBottom: 12, fontSize: "0.9rem", color: "#6c757d" }}>
              {selectedTicket.title}
            </p>
            <div className="form-group">
              <label htmlFor="modal-status">Status</label>
              <select
                id="modal-status"
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setSelectedTicket(null)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleStatusUpdate}
                disabled={updating}
              >
                {updating ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
