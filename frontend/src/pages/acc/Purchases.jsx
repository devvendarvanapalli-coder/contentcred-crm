import { useEffect, useState } from "react";
import { listPurchases, createPurchase, updatePurchase, deletePurchase, listParties } from "../../api/accApi";
import { Plus, Pencil, Trash2, X } from "lucide-react";

const inp = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400";
const EMPTY_LINE = { description: "", hsn_code: "", quantity: 1, unit: "Nos", unit_price: 0, gst_rate: 18 };

function todayStr() { return new Date().toISOString().split("T")[0]; }
function fmt(n) { return "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 }); }

const STATUS_COLORS = {
  Draft: "bg-gray-100 text-gray-700",
  Approved: "bg-blue-100 text-blue-700",
  Received: "bg-green-100 text-green-700",
};

function Modal({ title, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className={`bg-white rounded-2xl shadow-xl w-full ${wide ? "max-w-4xl" : "max-w-lg"} max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10">
          <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function Purchases() {
  const [purchases, setPurchases] = useState([]);
  const [parties, setParties] = useState([]);
  const [filterStatus, setFilterStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ party_id: "", po_date: todayStr(), status: "Draft" });
  const [lines, setLines] = useState([{ ...EMPTY_LINE }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function load() {
    setLoading(true);
    const params = filterStatus ? { status: filterStatus } : {};
    listPurchases(params).then(d => setPurchases(d.items || d)).finally(() => setLoading(false));
  }

  useEffect(() => { load(); listParties({ party_type: "Supplier", limit: 500 }).then(d => setParties(d.items || d)); }, [filterStatus]);

  function openAdd() {
    setEditing(null);
    setForm({ party_id: "", po_date: todayStr(), status: "Draft" });
    setLines([{ ...EMPTY_LINE }]);
    setError("");
    setModal("form");
  }

  function openEdit(po) {
    setEditing(po);
    setForm({ party_id: po.party_id, po_date: po.po_date?.split("T")[0] || todayStr(), status: po.status });
    setLines(Array.isArray(po.line_items) ? po.line_items : [{ ...EMPTY_LINE }]);
    setError("");
    setModal("form");
  }

  function lineTotal(l) { return Number(l.quantity) * Number(l.unit_price); }
  const subtotal = lines.reduce((s, l) => s + lineTotal(l), 0);
  const totalGST = lines.reduce((s, l) => s + lineTotal(l) * Number(l.gst_rate) / 100, 0);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.party_id) { setError("Select a supplier"); return; }
    setSaving(true); setError("");
    try {
      const payload = { ...form, party_id: Number(form.party_id), line_items: lines };
      if (editing) {
        await updatePurchase(editing.id, payload);
      } else {
        await createPurchase(payload);
      }
      setModal(null);
      load();
    } catch (err) {
      setError(err?.response?.data?.detail || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(po) {
    if (!window.confirm(`Delete PO ${po.po_number}?`)) return;
    await deletePurchase(po.id);
    load();
  }

  function setLine(i, k, v) {
    setLines(ls => ls.map((l, idx) => idx === i ? { ...l, [k]: v } : l));
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Purchase Orders</h1>
        <button onClick={openAdd} className="flex items-center gap-2 bg-purple-700 hover:bg-purple-800 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Plus size={16} /> New PO
        </button>
      </div>

      <div className="flex gap-3">
        <select className={inp + " max-w-xs"} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          {["Draft", "Approved", "Received"].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              {["PO #", "Supplier", "Date", "Subtotal", "GST", "Total", "Status", ""].map(h => (
                <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>
            ) : purchases.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No purchase orders found</td></tr>
            ) : purchases.map(po => (
              <tr key={po.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-purple-700">{po.po_number}</td>
                <td className="px-4 py-3 font-medium text-gray-800">{po.party_name || `#${po.party_id}`}</td>
                <td className="px-4 py-3 text-gray-600">{po.po_date ? new Date(po.po_date).toLocaleDateString("en-IN") : "—"}</td>
                <td className="px-4 py-3">{fmt(po.subtotal)}</td>
                <td className="px-4 py-3">{fmt(po.total_gst)}</td>
                <td className="px-4 py-3 font-semibold">{fmt(po.total_amount)}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[po.status] || ""}`}>{po.status}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(po)} className="text-gray-400 hover:text-purple-600"><Pencil size={15} /></button>
                    <button onClick={() => handleDelete(po)} className="text-gray-400 hover:text-red-500"><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal === "form" && (
        <Modal title={editing ? "Edit Purchase Order" : "New Purchase Order"} onClose={() => setModal(null)} wide>
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Supplier *</label>
                <select required className={inp} value={form.party_id} onChange={e => setForm(f => ({ ...f, party_id: e.target.value }))}>
                  <option value="">Select Supplier…</option>
                  {parties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                <select className={inp} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  {["Draft", "Approved", "Received"].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">PO Date</label>
                <input className={inp} type="date" value={form.po_date} onChange={e => setForm(f => ({ ...f, po_date: e.target.value }))} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-gray-700 uppercase">Line Items</label>
                <button type="button" onClick={() => setLines(ls => [...ls, { ...EMPTY_LINE }])} className="text-xs text-purple-700 hover:text-purple-900 font-medium">+ Add Row</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border border-gray-100 rounded-lg overflow-hidden">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      {["Description", "HSN", "Qty", "Unit", "Rate (₹)", "GST %", "Amount", ""].map(h => (
                        <th key={h} className="px-2 py-2 text-left font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {lines.map((l, i) => (
                      <tr key={i}>
                        <td className="px-1 py-1"><input className={inp} value={l.description} onChange={e => setLine(i, "description", e.target.value)} placeholder="Item" /></td>
                        <td className="px-1 py-1"><input className={inp + " w-20"} value={l.hsn_code} onChange={e => setLine(i, "hsn_code", e.target.value)} placeholder="HSN" /></td>
                        <td className="px-1 py-1"><input className={inp + " w-16"} type="number" min="0" step="0.01" value={l.quantity} onChange={e => setLine(i, "quantity", e.target.value)} /></td>
                        <td className="px-1 py-1">
                          <select className={inp + " w-20"} value={l.unit} onChange={e => setLine(i, "unit", e.target.value)}>
                            {["Nos", "Box", "Kg", "g", "L", "mL", "Pack", "Roll"].map(u => <option key={u} value={u}>{u}</option>)}
                          </select>
                        </td>
                        <td className="px-1 py-1"><input className={inp + " w-24"} type="number" min="0" step="0.01" value={l.unit_price} onChange={e => setLine(i, "unit_price", e.target.value)} /></td>
                        <td className="px-1 py-1">
                          <select className={inp + " w-16"} value={l.gst_rate} onChange={e => setLine(i, "gst_rate", e.target.value)}>
                            {[0, 5, 12, 18, 28].map(r => <option key={r} value={r}>{r}%</option>)}
                          </select>
                        </td>
                        <td className="px-2 py-1 font-semibold">{fmt(lineTotal(l))}</td>
                        <td className="px-1 py-1">
                          <button type="button" onClick={() => setLines(ls => ls.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600"><X size={14} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="text-right text-sm mt-2 space-y-0.5">
                <div>Subtotal: <strong>{fmt(subtotal)}</strong></div>
                <div>GST: <strong>{fmt(totalGST)}</strong></div>
                <div className="text-base font-bold text-purple-700">Total: {fmt(subtotal + totalGST)}</div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setModal(null)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-purple-700 hover:bg-purple-800 text-white rounded-lg disabled:opacity-50">
                {saving ? "Saving…" : editing ? "Update PO" : "Create PO"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
