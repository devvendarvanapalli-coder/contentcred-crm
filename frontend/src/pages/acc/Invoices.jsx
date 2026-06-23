import { useEffect, useState } from "react";
import { listInvoices, createInvoice, updateInvoice, listParties } from "../../api/accApi";
import { Plus, X, Trash2 } from "lucide-react";
import { format } from "date-fns";

const GST_RATES = [0, 5, 12, 18, 28];
const BLANK_ITEM = { description: "", hsn_code: "", quantity: 1, unit: "Box", rate: 0, gst_rate: 12 };

function computeTotals(items, partyState = "Maharashtra") {
  const intra = partyState.toLowerCase() === "maharashtra";
  let subtotal = 0, cgst = 0, sgst = 0, igst = 0;
  items.forEach(it => {
    const taxable = parseFloat(it.quantity || 0) * parseFloat(it.rate || 0);
    const rate = parseFloat(it.gst_rate || 0) / 100;
    subtotal += taxable;
    if (intra) { cgst += taxable * rate / 2; sgst += taxable * rate / 2; }
    else igst += taxable * rate;
  });
  return { subtotal: round(subtotal), cgst: round(cgst), sgst: round(sgst), igst: round(igst), total: round(subtotal + cgst + sgst + igst) };
}
function round(n) { return Math.round(n * 100) / 100; }

function InvoiceModal({ onSave, onClose, saving, parties }) {
  const [form, setForm] = useState({ party_id: "", invoice_date: new Date().toISOString().slice(0, 10), due_date: "", notes: "" });
  const [items, setItems] = useState([{ ...BLANK_ITEM }]);
  const party = parties.find(p => p.id === parseInt(form.party_id));
  const totals = computeTotals(items, party?.state || "Maharashtra");

  function addItem() { setItems(prev => [...prev, { ...BLANK_ITEM }]); }
  function removeItem(i) { setItems(prev => prev.filter((_, idx) => idx !== i)); }
  function setItem(i, k, v) { setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [k]: v } : it)); }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">New Invoice</h2>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-3"><label className="block text-xs font-medium text-gray-600 mb-1">Party *</label>
              <select value={form.party_id} onChange={e => setForm(f => ({ ...f, party_id: e.target.value }))} required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                <option value="">Select party…</option>{parties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Invoice Date</label><input type="date" value={form.invoice_date} onChange={e => setForm(f => ({ ...f, invoice_date: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Due Date</label><input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">GST Type</label><div className={`px-3 py-2 rounded-lg text-sm border ${party?.state?.toLowerCase() === "maharashtra" ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-orange-50 border-orange-200 text-orange-700"}`}>{party ? (party.state?.toLowerCase() === "maharashtra" ? "Intra-state (CGST+SGST)" : "Inter-state (IGST)") : "Select party first"}</div></div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2"><label className="text-xs font-medium text-gray-600">Line Items</label><button type="button" onClick={addItem} className="text-xs text-purple-700 font-medium hover:underline">+ Add Item</button></div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="bg-gray-50">{["Description","HSN","Qty","Unit","Rate (₹)","GST %","Amount",""].map(h => <th key={h} className="text-left px-2 py-2 font-medium text-gray-600">{h}</th>)}</tr></thead>
                <tbody>
                  {items.map((it, i) => (
                    <tr key={i} className="border-t border-gray-100">
                      <td className="px-1 py-1"><input value={it.description} onChange={e => setItem(i, "description", e.target.value)} className="w-32 border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-purple-400" /></td>
                      <td className="px-1 py-1"><input value={it.hsn_code} onChange={e => setItem(i, "hsn_code", e.target.value)} className="w-20 border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-purple-400" /></td>
                      <td className="px-1 py-1"><input type="number" value={it.quantity} onChange={e => setItem(i, "quantity", e.target.value)} className="w-14 border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-purple-400" /></td>
                      <td className="px-1 py-1"><input value={it.unit} onChange={e => setItem(i, "unit", e.target.value)} className="w-14 border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-purple-400" /></td>
                      <td className="px-1 py-1"><input type="number" value={it.rate} onChange={e => setItem(i, "rate", e.target.value)} className="w-20 border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-purple-400" /></td>
                      <td className="px-1 py-1"><select value={it.gst_rate} onChange={e => setItem(i, "gst_rate", e.target.value)} className="w-16 border border-gray-200 rounded px-1 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-purple-400">{GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}</select></td>
                      <td className="px-2 py-1 text-right font-medium">₹{(parseFloat(it.quantity || 0) * parseFloat(it.rate || 0)).toFixed(2)}</td>
                      <td className="px-1 py-1"><button onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600"><Trash2 size={13} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 bg-gray-50 rounded-lg p-4 space-y-1 text-sm text-right">
              <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>₹{totals.subtotal.toLocaleString("en-IN")}</span></div>
              {totals.cgst > 0 && <><div className="flex justify-between text-gray-600"><span>CGST</span><span>₹{totals.cgst.toLocaleString("en-IN")}</span></div><div className="flex justify-between text-gray-600"><span>SGST</span><span>₹{totals.sgst.toLocaleString("en-IN")}</span></div></>}
              {totals.igst > 0 && <div className="flex justify-between text-gray-600"><span>IGST</span><span>₹{totals.igst.toLocaleString("en-IN")}</span></div>}
              <div className="flex justify-between font-bold text-gray-900 pt-1 border-t border-gray-200"><span>Total</span><span>₹{totals.total.toLocaleString("en-IN")}</span></div>
            </div>
          </div>
          <div><label className="block text-xs font-medium text-gray-600 mb-1">Notes</label><textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" /></div>
        </div>
        <div className="flex gap-3 p-6 border-t border-gray-100">
          <button onClick={onClose} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm font-medium text-gray-700">Cancel</button>
          <button onClick={() => onSave({ ...form, party_id: parseInt(form.party_id), line_items: items })} disabled={saving || !form.party_id || items.length === 0} className="flex-1 bg-purple-700 hover:bg-purple-800 disabled:opacity-60 text-white rounded-lg py-2 text-sm font-medium">{saving ? "Saving…" : "Create Invoice"}</button>
        </div>
      </div>
    </div>
  );
}

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [parties, setParties] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    const params = statusFilter ? { payment_status: statusFilter } : {};
    listInvoices(params).then(setInvoices);
  }
  useEffect(() => { load(); listParties().then(setParties); }, [statusFilter]);

  async function handleSave(form) {
    setSaving(true);
    try { await createInvoice(form); setShowForm(false); load(); }
    finally { setSaving(false); }
  }

  async function changeStatus(id, field, value) {
    await updateInvoice(id, { [field]: value });
    setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, [field]: value } : inv));
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Sales Invoices</h1><p className="text-gray-500 text-sm">{invoices.length} invoices</p></div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-purple-700 hover:bg-purple-800 text-white px-4 py-2 rounded-lg text-sm font-medium"><Plus size={16} /> New Invoice</button>
      </div>
      <div className="flex gap-3">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"><option value="">All Status</option><option>Unpaid</option><option>Partial</option><option>Paid</option></select>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>{["Invoice #","Party","Date","Due Date","Subtotal","GST","Total","Status"].map(h => <th key={h} className="text-left px-5 py-3 font-medium text-gray-600">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoices.length === 0 ? <tr><td colSpan={8} className="py-10 text-center text-gray-400">No invoices yet</td></tr> : invoices.map(inv => (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-mono text-gray-800 text-xs">{inv.invoice_number}</td>
                  <td className="px-5 py-3 text-gray-800">{inv.party_name}</td>
                  <td className="px-5 py-3 text-gray-600 text-xs">{inv.invoice_date ? format(new Date(inv.invoice_date), "dd MMM yyyy") : "—"}</td>
                  <td className="px-5 py-3 text-gray-600 text-xs">{inv.due_date ? format(new Date(inv.due_date), "dd MMM yyyy") : "—"}</td>
                  <td className="px-5 py-3 text-gray-700">₹{Number(inv.subtotal).toLocaleString("en-IN")}</td>
                  <td className="px-5 py-3 text-gray-700">₹{Number((inv.cgst || 0) + (inv.sgst || 0) + (inv.igst || 0)).toLocaleString("en-IN")}</td>
                  <td className="px-5 py-3 font-semibold text-gray-900">₹{Number(inv.total_amount).toLocaleString("en-IN")}</td>
                  <td className="px-5 py-3"><select value={inv.payment_status} onChange={e => changeStatus(inv.id, "payment_status", e.target.value)} className={`text-xs font-medium px-2 py-0.5 rounded-full border-0 cursor-pointer focus:outline-none ${inv.payment_status === "Paid" ? "bg-green-100 text-green-700" : inv.payment_status === "Partial" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-600"}`}><option>Unpaid</option><option>Partial</option><option>Paid</option></select></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {showForm && <InvoiceModal parties={parties} onSave={handleSave} onClose={() => setShowForm(false)} saving={saving} />}
    </div>
  );
}
