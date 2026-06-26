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
export const getCampaigns       = ()           => api.get("/campaigns/").then(r => r.data);
export const getCampaign        = (id)         => api.get(`/campaigns/${id}`).then(r => r.data);
export const createCampaign     = (data)       => api.post("/campaigns/", data).then(r => r.data);
export const updateCampaign     = (id, data)   => api.patch(`/campaigns/${id}`, data).then(r => r.data);
export const deleteCampaign     = (id)         => api.delete(`/campaigns/${id}`).then(r => r.data);

export const getSubmissions     = (cid)        => api.get(`/campaigns/${cid}/submissions`).then(r => r.data);
export const addSubmission      = (cid, data)  => api.post(`/campaigns/${cid}/submissions`, data).then(r => r.data);
export const updateSubmission   = (cid, sid, data) => api.patch(`/campaigns/${cid}/submissions/${sid}`, data).then(r => r.data);
export const deleteSubmission   = (cid, sid)   => api.delete(`/campaigns/${cid}/submissions/${sid}`).then(r => r.data);
export const refreshViews       = (cid, sid)   => api.post(`/campaigns/${cid}/submissions/${sid}/refresh-views`).then(r => r.data);

export const getClippers        = ()           => api.get("/campaigns/clippers/all").then(r => r.data);
export const createClipper      = (data)       => api.post("/campaigns/clippers", data).then(r => r.data);
export const deleteClipper      = (id)         => api.delete(`/campaigns/clippers/${id}`).then(r => r.data);
