import { useEffect, useState } from "react";
import { listBatches, createBatch, updateBatch } from "../../api/gmpApi";
import { Plus, Factory, X, ChevronDown } from "lucide-react";

const STATUS_BADGE = {
  "In Progress": "bg-blue-100 text-blue-700",
  "QC Pending": "bg-yellow-100 text-yellow-700",
  "Approved": "bg-green-100 text-green-700",
  "Rejected": "bg-red-100 text-red-600",
  "Released": "bg-teal-100 text-teal-700",
};

const ALL_STATUSES = ["In Progress", "QC Pending", "Approved", "Rejected", "Released"];

const BLANK = {
  batch_number: "",
  product_name: "",
  product_type: "Absorbable",
  raw_materials_used: [],
  quantity_produced: 0,
  start_date: "",
  end_date: "",
  status: "In Progress",
  notes: "",
};

export default function Batches() {
  const [batches, setBatches] = useState([]);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ search: "", status: "", product_type: "" });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [statusDropdown, setStatusDropdown] = useState(null);

  function load() {
    setLoading(true);
    const params = {};
    if (filters.search) params.search = filters.search;
    if (filters.status) params.status = filters.status;
    if (filters.product_type) params.product_type = filters.product_type;
    listBatches(params)
      .then(d => { setBatches(d.batches); setTotal(d.total); })
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [filters]);

  function openCreate() {
    setEditing(null);
    setForm(BLANK);
    setError("");
    setShowModal(true);
  }

  function openEdit(b) {
    setEditing(b);
    setForm({
      batch_number: b.batch_number,
      product_name: b.product_name,
      product_type: b.product_type,
      raw_materials_used: b.raw_materials_used || [],
      quantity_produced: b.quantity_produced,
      start_date: b.start_date ? b.start_date.slice(0, 10) : "",
      end_date: b.end_date ? b.end_date.slice(0, 10) : "",
      status: b.status,
      notes: b.notes,
    });
    setError("");
    setShowModal(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        quantity_produced: parseFloat(form.quantity_produced) || 0,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
      };
      if (editing) {
        await updateBatch(editing.id, payload);
      } else {
        await createBatch(payload);
      }
      setShowModal(false);
      load();
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to save batch");
    } finally {
      setSaving(false);
    }
  }

  async function quickStatus(batch, newStatus) {
    try {
      await updateBatch(batch.id, {
        batch_number: batch.batch_number,
        product_name: batch.product_name,
        product_type: batch.product_type,
        raw_materials_used: batch.raw_materials_used || [],
        quantity_produced: batch.quantity_produced,
        start_date: batch.start_date,
        end_date: batch.end_date,
        status: newStatus,
        notes: batch.notes,
      });
      setStatusDropdown(null);
      load();
    } catch {
      // silently fail — user can use edit modal
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Production Batches</h1>
          <p className="text-gray-500 text-sm">{total} batches recorded</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          New Batch
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3">
        <input
          value={filters.search}
          onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
          placeholder="Search batch / product…"
          className="flex-1 min-w-48 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
        />
        <select
          value={filters.status}
          onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
        >
          <option value="">All Status</option>
          {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={filters.product_type}
          onChange={e => setFilters(f => ({ ...f, product_type: e.target.value }))}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
        >
          <option value="">All Types</option>
          <option value="Absorbable">Absorbable</option>
          <option value="Non-absorbable">Non-absorbable</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full" />
        </div>
      ) : batches.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
          <Factory size={40} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-400">No production batches found</p>
          <button onClick={openCreate} className="mt-4 text-green-700 text-sm hover:underline">
            Create your first batch
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {batches.map(b => (
            <div key={b.id} className="bg-white rounded-xl border border-gray-200 p-5 space-y-3 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-gray-900">{b.batch_number}</p>
                  <p className="text-sm text-gray-600 mt-0.5">{b.product_name}</p>
                </div>
                <div className="relative flex-shrink-0">
                  <button
                    onClick={() => setStatusDropdown(statusDropdown === b.id ? null : b.id)}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[b.status] || "bg-gray-100 text-gray-600"}`}
                  >
                    {b.status}
                    <ChevronDown size={12} />
                  </button>
                  {statusDropdown === b.id && (
                    <div className="absolute right-0 top-7 z-20 bg-white rounded-lg shadow-lg border border-gray-200 w-40 py-1">
                      {ALL_STATUSES.map(s => (
                        <button
                          key={s}
                          onClick={() => quickStatus(b, s)}
                          className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 ${b.status === s ? "font-semibold text-green-700" : "text-gray-700"}`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="text-xs text-gray-500 space-y-1">
                <div className="flex justify-between">
                  <span>Type</span>
                  <span className="text-gray-700 font-medium">{b.product_type}</span>
                </div>
                <div className="flex justify-between">
                  <span>Qty Produced</span>
                  <span className="text-gray-700 font-medium">{b.quantity_produced}</span>
                </div>
                {b.start_date && (
                  <div className="flex justify-between">
                    <span>Start</span>
                    <span className="text-gray-700">{new Date(b.start_date).toLocaleDateString()}</span>
                  </div>
                )}
                {b.end_date && (
                  <div className="flex justify-between">
                    <span>End</span>
                    <span className="text-gray-700">{new Date(b.end_date).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
              {b.notes && (
                <p className="text-xs text-gray-500 border-t border-gray-100 pt-2 line-clamp-2">{b.notes}</p>
              )}
              <button
                onClick={() => openEdit(b)}
                className="w-full text-center text-xs text-green-700 hover:text-green-800 font-medium pt-1 border-t border-gray-100"
              >
                Edit Batch
              </button>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="font-semibold text-gray-900">{editing ? "Edit Batch" : "New Production Batch"}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              {error && <p className="text-red-600 text-sm bg-red-50 rounded-lg p-3">{error}</p>}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Batch Number *</label>
                  <input
                    required
                    value={form.batch_number}
                    onChange={e => setForm(f => ({ ...f, batch_number: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
                  <input
                    required
                    value={form.product_name}
                    onChange={e => setForm(f => ({ ...f, product_name: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Type</label>
                  <select
                    value={form.product_type}
                    onChange={e => setForm(f => ({ ...f, product_type: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                  >
                    <option value="Absorbable">Absorbable</option>
                    <option value="Non-absorbable">Non-absorbable</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity Produced</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.quantity_produced}
                    onChange={e => setForm(f => ({ ...f, quantity_produced: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={form.end_date}
                    onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                  >
                    {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    rows={3}
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 resize-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="px-4 py-2 text-sm bg-green-700 hover:bg-green-800 text-white rounded-lg disabled:opacity-60">
                  {saving ? "Saving…" : editing ? "Update Batch" : "Create Batch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {statusDropdown && (
        <div className="fixed inset-0 z-10" onClick={() => setStatusDropdown(null)} />
      )}
    </div>
  );
}
