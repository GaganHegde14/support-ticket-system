import axios from "axios";

// In production (served via Nginx), API calls are proxied through /api/
// In development, point directly to Django backend
const API_BASE = process.env.REACT_APP_API_URL || "";

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

/* ─── Tickets ─── */
export const createTicket = (data) => api.post("/tickets/", data);

export const fetchTickets = (params = {}) =>
  api.get("/tickets/", { params });

export const updateTicket = (id, data) =>
  api.patch(`/tickets/${id}/`, data);

export const fetchStats = () => api.get("/tickets/stats/");

export const classifyTicket = (description) =>
  api.post("/tickets/classify/", { description });

export default api;
