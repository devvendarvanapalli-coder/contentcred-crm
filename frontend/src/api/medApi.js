import axios from "axios";

const BASE = "/api";

function getToken() {
  return localStorage.getItem("med_token");
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Auth ──────────────────────────────────────────────────────────────────

export async function login(email, password) {
  const form = new URLSearchParams();
  form.append("username", email);
  form.append("password", password);
  const res = await axios.post(`${BASE}/auth/login`, form, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  return res.data;
}

export async function getMe() {
  const res = await axios.get(`${BASE}/auth/me`, { headers: authHeaders() });
  return res.data;
}

export async function listUsers() {
  const res = await axios.get(`${BASE}/auth/users`, { headers: authHeaders() });
  return res.data;
}

export async function registerUser(data) {
  const res = await axios.post(`${BASE}/auth/register`, data, { headers: authHeaders() });
  return res.data;
}

export async function updateUser(id, data) {
  const res = await axios.put(`${BASE}/auth/users/${id}`, data, { headers: authHeaders() });
  return res.data;
}

export async function createAdmin(data) {
  const res = await axios.post(`${BASE}/auth/create-admin`, data);
  return res.data;
}

// ── Leads ─────────────────────────────────────────────────────────────────

export async function listLeads(params = {}) {
  const res = await axios.get(`${BASE}/med/leads`, { headers: authHeaders(), params });
  return res.data;
}

export async function getLead(id) {
  const res = await axios.get(`${BASE}/med/leads/${id}`, { headers: authHeaders() });
  return res.data;
}

export async function createLead(data) {
  const res = await axios.post(`${BASE}/med/leads`, data, { headers: authHeaders() });
  return res.data;
}

export async function updateLead(id, data) {
  const res = await axios.put(`${BASE}/med/leads/${id}`, data, { headers: authHeaders() });
  return res.data;
}

export async function deleteLead(id) {
  const res = await axios.delete(`${BASE}/med/leads/${id}`, { headers: authHeaders() });
  return res.data;
}

// ── Visits ────────────────────────────────────────────────────────────────

export async function listVisits(params = {}) {
  const res = await axios.get(`${BASE}/med/visits`, { headers: authHeaders(), params });
  return res.data;
}

export async function createVisit(data) {
  const res = await axios.post(`${BASE}/med/visits`, data, { headers: authHeaders() });
  return res.data;
}

// ── Orders ────────────────────────────────────────────────────────────────

export async function listOrders(params = {}) {
  const res = await axios.get(`${BASE}/med/orders`, { headers: authHeaders(), params });
  return res.data;
}

export async function createOrder(data) {
  const res = await axios.post(`${BASE}/med/orders`, data, { headers: authHeaders() });
  return res.data;
}

export async function updateOrder(id, data) {
  const res = await axios.put(`${BASE}/med/orders/${id}`, data, { headers: authHeaders() });
  return res.data;
}

// ── Reports ───────────────────────────────────────────────────────────────

export async function getSalesSummary() {
  const res = await axios.get(`${BASE}/med/reports/summary`, { headers: authHeaders() });
  return res.data;
}

export async function getRepReport(repId) {
  const res = await axios.get(`${BASE}/med/reports/rep/${repId}`, { headers: authHeaders() });
  return res.data;
}

// ── GPS ───────────────────────────────────────────────────────────────────

export async function pingGPS(data) {
  const res = await axios.post(`${BASE}/gps/ping`, data, { headers: authHeaders() });
  return res.data;
}

export async function getLatestLocations() {
  const res = await axios.get(`${BASE}/gps/latest`, { headers: authHeaders() });
  return res.data;
}

export async function getRepGPSHistory(repId) {
  const res = await axios.get(`${BASE}/gps/history/${repId}`, { headers: authHeaders() });
  return res.data;
}
