import React, { useState, useRef, useCallback } from "react";
import { createTicket, classifyTicket } from "../api";

const CATEGORIES = ["billing", "technical", "account", "general"];
const PRIORITIES = ["low", "medium", "high", "critical"];

const INITIAL_STATE = {
  title: "",
  description: "",
  category: "general",
  priority: "low",
};

export default function TicketForm({ onTicketCreated }) {
  const [form, setForm] = useState(INITIAL_STATE);
  const [classifying, setClassifying] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [classified, setClassified] = useState(false);
  const debounceRef = useRef(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError("");

    // Auto-classify on description change
    if (name === "description" && value.trim().length > 15) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        runClassification(value.trim());
      }, 800);
    }
  };

  const handleDescriptionBlur = () => {
    if (form.description.trim().length > 10 && !classified) {
      runClassification(form.description.trim());
    }
  };

  const runClassification = useCallback(async (description) => {
    setClassifying(true);
    try {
      const { data } = await classifyTicket(description);
      setForm((prev) => ({
        ...prev,
        category: data.suggested_category || prev.category,
        priority: data.suggested_priority || prev.priority,
      }));
      setClassified(true);
    } catch {
      // LLM failure should not block anything
    } finally {
      setClassifying(false);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!form.description.trim()) {
      setError("Description is required.");
      return;
    }

    setSubmitting(true);
    try {
      await createTicket(form);
      setForm(INITIAL_STATE);
      setClassified(false);
      if (onTicketCreated) onTicketCreated();
    } catch (err) {
      const detail =
        err.response?.data?.detail ||
        Object.values(err.response?.data || {})?.[0]?.[0] ||
        "Failed to create ticket.";
      setError(typeof detail === "string" ? detail : JSON.stringify(detail));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card">
      <h2>Create Ticket</h2>
      <form onSubmit={handleSubmit} noValidate>
        {error && <p className="error-text">{error}</p>}

        <div className="form-group">
          <label htmlFor="title">Title *</label>
          <input
            id="title"
            name="title"
            maxLength={200}
            value={form.title}
            onChange={handleChange}
            placeholder="Brief summary of the issue"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Description *</label>
          <textarea
            id="description"
            name="description"
            value={form.description}
            onChange={handleChange}
            onBlur={handleDescriptionBlur}
            placeholder="Describe your issue in detail…"
            required
          />
        </div>

        {classifying && (
          <div className="classification-banner">
            <div className="spinner-small" />
            Classifying with AI…
          </div>
        )}

        <div className="form-group">
          <label htmlFor="category">Category</label>
          <select
            id="category"
            name="category"
            value={form.category}
            onChange={handleChange}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="priority">Priority</label>
          <select
            id="priority"
            name="priority"
            value={form.priority}
            onChange={handleChange}
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={submitting || classifying}
        >
          {submitting ? "Creating…" : "Create Ticket"}
        </button>
      </form>
    </div>
  );
}
