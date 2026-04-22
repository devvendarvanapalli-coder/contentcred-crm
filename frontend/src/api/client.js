import axios from "axios";

const api = axios.create({ baseURL: "/api" });
export default api;

// ── Creators ─────────────────────────────────────────────────────
export const getCreators = (params) => api.get("/creators/", { params }).then(r => r.data);
export const updateCreator = (id, data) => api.patch(`/creators/${id}`, data).then(r => r.data);
export const deleteCreator = (id) => api.delete(`/creators/${id}`).then(r => r.data);

// ── Analytics ─────────────────────────────────────────────────────
export const getOverview = () => api.get("/analytics/overview").then(r => r.data);
export const getByPersona = () => api.get("/analytics/by-persona").then(r => r.data);
export const getByPlatform = () => api.get("/analytics/by-platform").then(r => r.data);
export const getScraperRuns = () => api.get("/analytics/scraper-runs").then(r => r.data);

// ── Sequences ─────────────────────────────────────────────────────
export const triggerOutreach = () => api.post("/sequences/trigger-outreach").then(r => r.data);
export const triggerScrape   = () => api.post("/sequences/trigger-scrape").then(r => r.data);
export const getEnrollments  = () => api.get("/sequences/enrollments").then(r => r.data);
