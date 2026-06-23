import { useEffect, useState } from "react";
import { listPayments, createPayment, deletePayment, listParties, listInvoices } from "../../api/accApi";
import { Plus, Trash2, X } from "lucide-react";

const inp = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400";
function todayStr() { return new Date().toISOString().split("T")[0]; }
function fmt(n) { return "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 }); }

const MODES = ["Cash", "NEFT", "UPI", "Cheque"];

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [parties, setParties] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [filterParty, setFilterParty] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ party_id: "", invoice_id: "", payment_date: todayStr(), amount: "", payment_mode: "NEFT", reference_number: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function load() {
    setLoading(true);
    const params = filterParty ? { party_id: filterParty } : {};
    listPayments(params).then(d => setPayments(d.items || d)).finally(() => setLoading(false));
  }

  useEffect(() => { load(); listParties({ limit: 500 }).then(d => setParties(d.items || d)); }, [filterParty]);

  useEffect(() => {
    if (form.party_id) {
      listInvoices({ party_id: form.party_id, payment_status: "Unpaid", limit: 200 })
        .then(d => setInvoices(d.items || d));
    } else {
      setInvoices([]);
    }
  }, [form.party_id]);

  function openAdd() {
    setForm({ party_id: "", invoice_id: "", payment_date: todayStr(), amount: "", payment_mode: "NEFT", reference_number: "", notes: "" });
    setError("");
    setModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.party_id) { setError("Select a party"); return; }
    if (!form.amount || Number(form.amount) <= 0) { setError("Enter a valid amount"); return; }
    setSaving(true); setError("");
    try {
      await createPayment({
        ...form,
        party_id: Number(form.party_id),
        invoice_id: form.invoice_id ? Number(form.invoice_id) : null,
        amount: Number(form.amount),
      });
      setModal(false);
      load();
    } catch (err) {
      setError(err?.response?.data?.detail || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(p) {
    if (!window.confirm("Delete this payment?")) return;
    await deletePayment(p.id);
    load();
  }

  function set(k) { return e => setForm(f => ({ ...f, [k]: e.target.value })); }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Payments</h1>
        <button onClick={openAdd} className="flex items-center gap-2 bg-purple-700 hover:bg-purple-800 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Plus size={16} /> Record Payment
        </button>
      </div>

      <div className="flex gap-3">
        <select className={inp + " max-w-xs"} value={filterParty} onChange={e => setFilterParty(Number(e.target.value))}>
          <option value={0}>All Parties</option>
          {parties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              {["Date", "Party", "Invoice", "Mode", "Reference", "Amount", ""].map(h => (
                <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>
            ) : payments.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No payments recorded</td></tr>
            ) : payments.map(pay => (
              <tr key={pay.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-600">{pay.payment_date ? new Date(pay.payment_date).toLocaleDateString("en-IN") : "—"}</td>
                <td className="px-4 py-3 font-medium text-gray-800">{pay.party_name || `#${pay.party_id}`}</td>
                <td className="px-4 py-3 font-mono text-purple-700 text-xs">{pay.invoice_number || "—"}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">{pay.payment_mode}</span>
                </td>
                <td className="px-4 py-3 text-gray-600 text-xs">{pay.reference_number || "—"}</td>
                <td className="px-4 py-3 font-semibold text-green-700">{fmt(pay.amount)}</td>
                <td className="px-4 py-3">
                  <button onClick={() => handleDelete(pay)} className="text-gray-400 hover:text-red-500"><Trash2 size={15} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title="Record Payment" onClose={() => setModal(false)}>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Party *</label>
              <select required className={inp} value={form.party_id} onChange={set("party_id")}>
                <option value="">Select Party…</option>
                {parties.map(p => <option key={p.id} value={p.id}>{p.name} ({p.party_type})</option>)}
              </select>
            </div>
            {invoices.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Against Invoice (optional)</label>
                <select className={inp} value={form.invoice_id} onChange={set("invoice_id")}>
                  <option value="">No specific invoice</option>
                  {invoices.map(inv => (
                    <option key={inv.id} value={inv.id}>{inv.invoice_number} — ₹{Number(inv.total_amount).toLocaleString("en-IN")}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Payment Date</label>
                <input className={inp} type="date" value={form.payment_date} onChange={set("payment_date")} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Amount (₹) *</label>
                <input required className={inp} type="number" min="0.01" step="0.01" value={form.amount} onChange={set("amount")} placeholder="0.00" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Payment Mode</label>
                <select className={inp} value={form.payment_mode} onChange={set("payment_mode")}>
                  {MODES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Reference / UTR</label>
                <input className={inp} value={form.reference_number} onChange={set("reference_number")} placeholder="Cheque no. / UTR…" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
              <textarea className={inp} rows={2} value={form.notes} onChange={set("notes")} />
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setModal(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-purple-700 hover:bg-purple-800 text-white rounded-lg disabled:opacity-50">
                {saving ? "Saving…" : "Record Payment"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
