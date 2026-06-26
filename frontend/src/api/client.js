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

// ── Campaigns ─────────────────────────────────────────────────────
export const getCampaigns    = (params) => api.get("/campaigns/", { params }).then(r => r.data);
export const getCampaign     = (id) => api.get(`/campaigns/${id}`).then(r => r.data);
export const createCampaign  = (data) => api.post("/campaigns/", data).then(r => r.data);
export const updateCampaign  = (id, data) => api.patch(`/campaigns/${id}`, data).then(r => r.data);
export const deleteCampaign  = (id) => api.delete(`/campaigns/${id}`).then(r => r.data);

export const getClippers     = (cid) => api.get(`/campaigns/${cid}/clippers`).then(r => r.data);
export const addClipper      = (cid, data) => api.post(`/campaigns/${cid}/clippers`, data).then(r => r.data);
export const updateClipper   = (cid, clid, data) => api.patch(`/campaigns/${cid}/clippers/${clid}`, data).then(r => r.data);
export const deleteClipper   = (cid, clid) => api.delete(`/campaigns/${cid}/clippers/${clid}`).then(r => r.data);

export const getClips        = (cid, clid) => api.get(`/campaigns/${cid}/clippers/${clid}/clips`).then(r => r.data);
export const addClip         = (cid, clid, data) => api.post(`/campaigns/${cid}/clippers/${clid}/clips`, data).then(r => r.data);
export const updateClipViews = (cid, clid, clipId, views) =>
  api.patch(`/campaigns/${cid}/clippers/${clid}/clips/${clipId}`, { current_views: views }).then(r => r.data);
export const deleteClip      = (cid, clid, clipId) =>
  api.delete(`/campaigns/${cid}/clippers/${clid}/clips/${clipId}`).then(r => r.data);
export const getClipHistory  = (cid, clid, clipId) =>
  api.get(`/campaigns/${cid}/clippers/${clid}/clips/${clipId}/history`).then(r => r.data);
export const getAllCampaignClips = (cid) => api.get(`/campaigns/${cid}/clips`).then(r => r.data);
