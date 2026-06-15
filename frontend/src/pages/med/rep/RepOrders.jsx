import { useEffect, useState } from "react";
import { listOrders, createOrder, listLeads } from "../../../api/medApi";
import { Plus, CheckCircle, X } from "lucide-react";
import { format } from "date-fns";

const SUTURE_PRODUCTS = [
  "Absorbable Plain Catgut",
  "Absorbable Chromic Catgut",
  "Polyglycolic Acid (PGA)",
  "Polyglactin 910 (Vicryl type)",
  "Poliglecaprone (Monocryl type)",
  "Non-absorbable Silk",
  "Non-absorbable Nylon (Ethilon type)",
  "Non-absorbable Polypropylene",
  "Non-absorbable Stainless Steel",
  "Polyester (Mersilene type)",
];

export default function RepOrders() {
  const [orders, setOrders] = useState([]);
  const [leads, setLeads] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    lead_id: "", invoice_number: "", product_details: "", total_amount: 0, notes: ""
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    listOrders().then(setOrders);
    listLeads({ limit: 200 }).then(d => setLeads(d.leads || []));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await createOrder({ ...form, lead_id: parseInt(form.lead_id), total_amount: parseFloat(form.total_amount) || 0 });
      setShowForm(false);
      setForm({ lead_id: "", invoice_number: "", product_details: "", total_amount: 0, notes: "" });
      listOrders().then(setOrders);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
          <p className="text-gray-500 text-sm">{orders.length} orders placed</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Plus size={16} /> New Order
        </button>
      </div>

      {success && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3">
          <CheckCircle size={18} /> Order saved successfully!
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-gray-900">New Order</h2>
              <button onClick={() => setShowForm(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hospital *</label>
                <select value={form.lead_id} onChange={e => setForm(f => ({ ...f, lead_id: e.target.value }))} required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select…</option>
                  {leads.map(l => <option key={l.id} value={l.id}>{l.hospital_name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Number</label>
                  <input value={form.invoice_number} onChange={e => setForm(f => ({ ...f, invoice_number: e.target.value }))}
                    placeholder="INV-2024-001"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount (₹)</label>
                  <input type="number" value={form.total_amount} onChange={e => setForm(f => ({ ...f, total_amount: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Products</label>
                <select onChange={e => {
                  if (e.target.value) setForm(f => ({
                    ...f,
                    product_details: f.product_details ? `${f.product_details}, ${e.target.value}` : e.target.value
                  }));
                  e.target.value = "";
                }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2">
                  <option value="">Add product…</option>
                  {SUTURE_PRODUCTS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <textarea value={form.product_details} onChange={e => setForm(f => ({ ...f, product_details: e.target.value }))}
                  rows={3} placeholder="List of products ordered…"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-200 rounded-lg py-2 text-sm font-medium text-gray-700">Cancel</button>
                <button type="submit" disabled={saving || !form.lead_id}
                  className="flex-1 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white rounded-lg py-2 text-sm font-medium">
                  {saving ? "Saving…" : "Save Order"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Invoice</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Hospital</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Date</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Amount</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.length === 0 ? (
                <tr><td colSpan={5} className="py-10 text-center text-gray-400">No orders yet</td></tr>
              ) : orders.map(o => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-mono text-gray-700">{o.invoice_number || `#${o.id}`}</td>
                  <td className="px-5 py-3 text-gray-700">Lead #{o.lead_id}</td>
                  <td className="px-5 py-3 text-gray-600">{o.order_date ? format(new Date(o.order_date), "dd MMM yyyy") : "—"}</td>
                  <td className="px-5 py-3 font-semibold text-gray-900">₹{Number(o.total_amount || 0).toLocaleString("en-IN")}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${o.status === "Delivered" ? "bg-green-100 text-green-700" : o.status === "Cancelled" ? "bg-red-100 text-red-600" : "bg-yellow-100 text-yellow-700"}`}>
                      {o.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
