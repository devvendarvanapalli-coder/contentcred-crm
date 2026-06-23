import axios from "axios";

const BASE = "/api";

function getToken() {
  return localStorage.getItem("med_token");
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Raw Materials ─────────────────────────────────────────────────────────────

export async function listMaterials(params = {}) {
  const res = await axios.get(`${BASE}/gmp/materials`, { headers: authHeaders(), params });
  return res.data;
}

export async function createMaterial(data) {
  const res = await axios.post(`${BASE}/gmp/materials`, data, { headers: authHeaders() });
  return res.data;
}

export async function updateMaterial(id, data) {
  const res = await axios.put(`${BASE}/gmp/materials/${id}`, data, { headers: authHeaders() });
  return res.data;
}

// ── Production Batches ────────────────────────────────────────────────────────

export async function listBatches(params = {}) {
  const res = await axios.get(`${BASE}/gmp/batches`, { headers: authHeaders(), params });
  return res.data;
}

export async function createBatch(data) {
  const res = await axios.post(`${BASE}/gmp/batches`, data, { headers: authHeaders() });
  return res.data;
}

export async function updateBatch(id, data) {
  const res = await axios.put(`${BASE}/gmp/batches/${id}`, data, { headers: authHeaders() });
  return res.data;
}

// ── QC Tests ──────────────────────────────────────────────────────────────────

export async function listQCTests(params = {}) {
  const res = await axios.get(`${BASE}/gmp/qc-tests`, { headers: authHeaders(), params });
  return res.data;
}

export async function createQCTest(data) {
  const res = await axios.post(`${BASE}/gmp/qc-tests`, data, { headers: authHeaders() });
  return res.data;
}

export async function updateQCTest(id, data) {
  const res = await axios.put(`${BASE}/gmp/qc-tests/${id}`, data, { headers: authHeaders() });
  return res.data;
}

// ── Packaging ─────────────────────────────────────────────────────────────────

export async function listPackaging(params = {}) {
  const res = await axios.get(`${BASE}/gmp/packaging`, { headers: authHeaders(), params });
  return res.data;
}

export async function createPackaging(data) {
  const res = await axios.post(`${BASE}/gmp/packaging`, data, { headers: authHeaders() });
  return res.data;
}

// ── Reports ───────────────────────────────────────────────────────────────────

export async function getGMPSummary() {
  const res = await axios.get(`${BASE}/gmp/reports/summary`, { headers: authHeaders() });
  return res.data;
}
