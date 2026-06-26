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
export const updateClipMetrics = (cid, clid, clipId, metrics) =>
  api.patch(`/campaigns/${cid}/clippers/${clid}/clips/${clipId}`, metrics).then(r => r.data);
export const deleteClip      = (cid, clid, clipId) =>
  api.delete(`/campaigns/${cid}/clippers/${clid}/clips/${clipId}`).then(r => r.data);
export const getClipHistory  = (cid, clid, clipId) =>
  api.get(`/campaigns/${cid}/clippers/${clid}/clips/${clipId}/history`).then(r => r.data);

// ── Submissions (approval workflow) ───────────────────────────────
export const getSubmissions    = (cid, status) => api.get(`/campaigns/${cid}/submissions`, { params: status ? { status } : {} }).then(r => r.data);
export const approveSubmission = (cid, clipId) => api.post(`/campaigns/${cid}/submissions/${clipId}/approve`).then(r => r.data);
export const rejectSubmission  = (cid, clipId, reason, ban) => api.post(`/campaigns/${cid}/submissions/${clipId}/reject`, { reason, ban_clipper: ban }).then(r => r.data);
export const flagSubmission    = (cid, clipId, reason) => api.post(`/campaigns/${cid}/submissions/${clipId}/flag`, { reason }).then(r => r.data);

// ── Leaderboard & Analysis ─────────────────────────────────────────
export const getLeaderboard     = (cid) => api.get(`/campaigns/${cid}/leaderboard`).then(r => r.data);
export const getCampaignAnalysis= (cid) => api.get(`/campaigns/${cid}/analysis`).then(r => r.data);

// ── Public ────────────────────────────────────────────────────────
export const getDiscover       = () => api.get("/campaigns/discover/list").then(r => r.data);
export const getPublicCampaign = (token) => api.get(`/campaigns/public/${token}`).then(r => r.data);
export const publicSubmit      = (token, data) => api.post(`/campaigns/public/${token}/submit`, data).then(r => r.data);
export const getClipperStatus  = (email) => api.get("/public/status", { params: { email } }).then(r => r.data);

// ── Budget top-up ─────────────────────────────────────────────────
export const topupBudget = (cid, amount) => api.post(`/campaigns/${cid}/topup`, { amount }).then(r => r.data);

// ── Clone ─────────────────────────────────────────────────────────
export const cloneCampaign = (cid) => api.post(`/campaigns/${cid}/clone`).then(r => r.data);

// ── Payout management ─────────────────────────────────────────────
export const getPayoutQueue   = (cid) => api.get(`/campaigns/${cid}/payout-queue`).then(r => r.data);
export const createPayout     = (cid, notes) => api.post(`/campaigns/${cid}/payout`, { notes }).then(r => r.data);
export const getPayoutBatches = (cid) => api.get(`/campaigns/${cid}/payout-batches`).then(r => r.data);

// ── CSV Export ────────────────────────────────────────────────────
export const exportCsv = (cid) => api.get(`/campaigns/${cid}/export.csv`, { responseType: "blob" }).then(r => r);

// ── View refresh ──────────────────────────────────────────────────
export const fetchClipViews  = (cid, clipId) => api.post(`/campaigns/${cid}/submissions/${clipId}/fetch-views`).then(r => r.data);
export const refreshAllViews = (cid) => api.post(`/campaigns/${cid}/refresh-views`).then(r => r.data);
