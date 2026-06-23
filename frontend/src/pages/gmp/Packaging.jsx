import { useEffect, useState } from "react";
import { listPackaging, createPackaging, listBatches } from "../../api/gmpApi";
import { Plus, Package, X, CheckCircle2, Circle } from "lucide-react";

const STATUS_BADGE = {
  Pending: "bg-yellow-100 text-yellow-700",
  Done: "bg-green-100 text-green-700",
};

const BLANK = {
  batch_id: "",
  packaging_date: "",
  units_packaged: 0,
  label_verified: false,
  sterility_checked: false,
  packager_name: "",
  status: "Pending",
  notes: "",
};

export default function Packaging() {
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [batches, setBatches] = useState([]);
  const [filters, setFilters] = useState({ status: "", batch_id: "" });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function load() {
    setLoading(true);
    const params = {};
    if (filters.status) params.status = filters.status;
    if (filters.batch_id) params.batch_id = filters.batch_id;
    listPackaging(params)
      .then(d => { setRecords(d.records); setTotal(d.total); })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    listBatches().then(d => setBatches(d.batches));
  }, []);

  useEffect(() => { load(); }, [filters]);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await createPackaging({
        ...form,
        batch_id: parseInt(form.batch_id),
        units_packaged: parseInt(form.units_packaged) || 0,
        packaging_date: form.packaging_date || null,
      });
      setShowModal(false);
      setForm(BLANK);
      load();
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to save packaging record");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Packaging</h1>
          <p className="text-gray-500 text-sm">{total} packaging records</p>
        </div>
        <button
          onClick={() => { setForm(BLANK); setError(""); setShowModal(true); }}
          className="flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Add Record
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3">
        <select
          value={filters.status}
          onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
        >
          <option value="">All Status</option>
          <option value="Pending">Pending</option>
          <option value="Done">Done</option>
        </select>
        <select
          value={filters.batch_id}
          onChange={e => setFilters(f => ({ ...f, batch_id: e.target.value }))}
          className="flex-1 min-w-48 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
        >
          <option value="">All Batches</option>
          {batches.map(b => (
            <option key={b.id} value={b.id}>{b.batch_number} — {b.product_name}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Batch</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Date</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Units</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Label Verified</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Sterility Checked</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Packager</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={7} className="py-10 text-center text-gray-400">Loading…</td></tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center">
                    <Package size={36} className="mx-auto text-gray-200 mb-2" />
                    <p className="text-gray-400">No packaging records found</p>
                  </td>
                </tr>
              ) : records.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-900">{r.batch_number || `#${r.batch_id}`}</p>
                    <p className="text-xs text-gray-500">{r.product_name || ""}</p>
                  </td>
                  <td className="px-5 py-3 text-gray-700">
                    {r.packaging_date ? new Date(r.packaging_date).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-5 py-3 font-medium text-gray-800">{r.units_packaged}</td>
                  <td className="px-5 py-3">
                    {r.label_verified
                      ? <CheckCircle2 size={16} className="text-green-600" />
                      : <Circle size={16} className="text-gray-300" />}
                  </td>
                  <td className="px-5 py-3">
                    {r.sterility_checked
                      ? <CheckCircle2 size={16} className="text-green-600" />
                      : <Circle size={16} className="text-gray-300" />}
                  </td>
                  <td className="px-5 py-3 text-gray-700">{r.packager_name || "—"}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[r.status] || "bg-gray-100 text-gray-600"}`}>
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="font-semibold text-gray-900">Add Packaging Record</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              {error && <p className="text-red-600 text-sm bg-red-50 rounded-lg p-3">{error}</p>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Batch *</label>
                <select
                  required
                  value={form.batch_id}
                  onChange={e => setForm(f => ({ ...f, batch_id: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                >
                  <option value="">Select batch…</option>
                  {batches.map(b => (
                    <option key={b.id} value={b.id}>{b.batch_number} — {b.product_name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Packaging Date</label>
                  <input
                    type="date"
                    value={form.packaging_date}
                    onChange={e => setForm(f => ({ ...f, packaging_date: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Units Packaged</label>
                  <input
                    type="number"
                    min="0"
                    value={form.units_packaged}
                    onChange={e => setForm(f => ({ ...f, units_packaged: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Packager Name</label>
                  <input
                    value={form.packager_name}
                    onChange={e => setForm(f => ({ ...f, packager_name: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Done">Done</option>
                  </select>
                </div>
                <div className="col-span-2 space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.label_verified}
                      onChange={e => setForm(f => ({ ...f, label_verified: e.target.checked }))}
                      className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-600"
                    />
                    <span className="text-sm text-gray-700">Label Verified</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.sterility_checked}
                      onChange={e => setForm(f => ({ ...f, sterility_checked: e.target.checked }))}
                      className="w-4 h-4 rounded border-gray-300 text-green--600 focus:ring-green-600"
                    />
                    <span className="text-sm text-gray-700">Sterility Checked</span>
                  </label>
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
                  {saving ? "Saving…" : "Add Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
