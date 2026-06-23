import axios from "axios";

const BASE = "/api";

function getToken() {
  return localStorage.getItem("med_token");
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Parties ───────────────────────────────────────────────────────────────

export async function listParties(params = {}) {
  const res = await axios.get(`${BASE}/acc/parties`, { headers: authHeaders(), params });
  return res.data;
}

export async function getParty(id) {
  const res = await axios.get(`${BASE}/acc/parties/${id}`, { headers: authHeaders() });
  return res.data;
}

export async function createParty(data) {
  const res = await axios.post(`${BASE}/acc/parties`, data, { headers: authHeaders() });
  return res.data;
}

export async function updateParty(id, data) {
  const res = await axios.put(`${BASE}/acc/parties/${id}`, data, { headers: authHeaders() });
  return res.data;
}

export async function deleteParty(id) {
  const res = await axios.delete(`${BASE}/acc/parties/${id}`, { headers: authHeaders() });
  return res.data;
}

// ── Invoices ──────────────────────────────────────────────────────────────

export async function listInvoices(params = {}) {
  const res = await axios.get(`${BASE}/acc/invoices`, { headers: authHeaders(), params });
  return res.data;
}

export async function getInvoice(id) {
  const res = await axios.get(`${BASE}/acc/invoices/${id}`, { headers: authHeaders() });
  return res.data;
}

export async function createInvoice(data) {
  const res = await axios.post(`${BASE}/acc/invoices`, data, { headers: authHeaders() });
  return res.data;
}

export async function updateInvoice(id, data) {
  const res = await axios.put(`${BASE}/acc/invoices/${id}`, data, { headers: authHeaders() });
  return res.data;
}

export async function deleteInvoice(id) {
  const res = await axios.delete(`${BASE}/acc/invoices/${id}`, { headers: authHeaders() });
  return res.data;
}

// ── Purchase Orders ───────────────────────────────────────────────────────

export async function listPurchases(params = {}) {
  const res = await axios.get(`${BASE}/acc/purchases`, { headers: authHeaders(), params });
  return res.data;
}

export async function getPurchase(id) {
  const res = await axios.get(`${BASE}/acc/purchases/${id}`, { headers: authHeaders() });
  return res.data;
}

export async function createPurchase(data) {
  const res = await axios.post(`${BASE}/acc/purchases`, data, { headers: authHeaders() });
  return res.data;
}

export async function updatePurchase(id, data) {
  const res = await axios.put(`${BASE}/acc/purchases/${id}`, data, { headers: authHeaders() });
  return res.data;
}

export async function deletePurchase(id) {
  const res = await axios.delete(`${BASE}/acc/purchases/${id}`, { headers: authHeaders() });
  return res.data;
}

// ── Payments ──────────────────────────────────────────────────────────────

export async function listPayments(params = {}) {
  const res = await axios.get(`${BASE}/acc/payments`, { headers: authHeaders(), params });
  return res.data;
}

export async function getPayment(id) {
  const res = await axios.get(`${BASE}/acc/payments/${id}`, { headers: authHeaders() });
  return res.data;
}

export async function createPayment(data) {
  const res = await axios.post(`${BASE}/acc/payments`, data, { headers: authHeaders() });
  return res.data;
}

export async function deletePayment(id) {
  const res = await axios.delete(`${BASE}/acc/payments/${id}`, { headers: authHeaders() });
  return res.data;
}

// ── Ledger ────────────────────────────────────────────────────────────────

export async function getLedger(partyId, params = {}) {
  const res = await axios.get(`${BASE}/acc/ledger/${partyId}`, { headers: authHeaders(), params });
  return res.data;
}

// ── GST Reports ───────────────────────────────────────────────────────────

export async function getGSTSummary(params = {}) {
  const res = await axios.get(`${BASE}/acc/gst/summary`, { headers: authHeaders(), params });
  return res.data;
}

export async function getGSTR1(params = {}) {
  const res = await axios.get(`${BASE}/acc/gst/gstr1`, { headers: authHeaders(), params });
  return res.data;
}

export async function getGSTR3B(params = {}) {
  const res = await axios.get(`${BASE}/acc/gst/gstr3b`, { headers: authHeaders(), params });
  return res.data;
}

// ── Dashboard ─────────────────────────────────────────────────────────────

export async function getAccDashboard(params = {}) {
  const res = await axios.get(`${BASE}/acc/dashboard`, { headers: authHeaders(), params });
  return res.data;
}
