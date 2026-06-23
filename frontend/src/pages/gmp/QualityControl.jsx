import { useEffect, useState } from "react";
import { listQCTests, createQCTest, updateQCTest, listBatches } from "../../api/gmpApi";
import { Plus, ClipboardCheck, X, Search } from "lucide-react";

const RESULT_BADGE = {
  Pass: "bg-green-100 text-green-700",
  Fail: "bg-red-100 text-red-600",
  Pending: "bg-yellow-100 text-yellow-700",
};

const BLANK = {
  batch_id: "",
  test_name: "",
  test_date: "",
  result: "Pending",
  observations: "",
  attachments_note: "",
};

export default function QualityControl() {
  const [tests, setTests] = useState([]);
  const [total, setTotal] = useState(0);
  const [batches, setBatches] = useState([]);
  const [filters, setFilters] = useState({ result: "", batch_id: "" });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function load() {
    setLoading(true);
    const params = {};
    if (filters.result) params.result = filters.result;
    if (filters.batch_id) params.batch_id = filters.batch_id;
    listQCTests(params)
      .then(d => { setTests(d.tests); setTotal(d.total); })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    listBatches().then(d => setBatches(d.batches));
  }, []);

  useEffect(() => { load(); }, [filters]);

  function openCreate() {
    setEditing(null);
    setForm(BLANK);
    setError("");
    setShowModal(true);
  }

  function openEdit(t) {
    setEditing(t);
    setForm({
      batch_id: t.batch_id,
      test_name: t.test_name,
      test_date: t.test_date ? t.test_date.slice(0, 10) : "",
      result: t.result,
      observations: t.observations,
      attachments_note: t.attachments_note,
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
        batch_id: parseInt(form.batch_id),
        test_date: form.test_date || null,
      };
      if (editing) {
        await updateQCTest(editing.id, payload);
      } else {
        await createQCTest(payload);
      }
      setShowModal(false);
      load();
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to save QC test");
    } finally {
      setSaving(false);
    }
  }

  function getBatchLabel(id) {
    const b = batches.find(b => b.id === id);
    return b ? `${b.batch_number} — ${b.product_name}` : `Batch #${id}`;
  }

  // Group tests by batch_id
  const grouped = {};
  tests.forEach(t => {
    const key = t.batch_id;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(t);
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quality Control</h1>
          <p className="text-gray-500 text-sm">{total} QC tests recorded</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Add QC Test
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3">
        <select
          value={filters.result}
          onChange={e => setFilters(f => ({ ...f, result: e.target.value }))}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
        >
          <option value="">All Results</option>
          <option value="Pass">Pass</option>
          <option value="Fail">Fail</option>
          <option value="Pending">Pending</option>
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

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full" />
        </div>
      ) : tests.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
          <ClipboardCheck size={40} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-400">No QC tests found</p>
          <button onClick={openCreate} className="mt-4 text-green-700 text-sm hover:underline">
            Add your first QC test
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([batchId, batchTests]) => (
            <div key={batchId} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-3">
                <ClipboardCheck size={16} className="text-green-700" />
                <span className="font-medium text-gray-800 text-sm">{getBatchLabel(parseInt(batchId))}</span>
                <span className="text-xs text-gray-500 ml-auto">{batchTests.length} test{batchTests.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="divide-y divide-gray-100">
                {batchTests.map(t => (
                  <div key={t.id} className="px-5 py-4 flex items-start gap-4 hover:bg-gray-50">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <p className="font-medium text-gray-900 text-sm">{t.test_name}</p>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${RESULT_BADGE[t.result] || "bg-gray-100 text-gray-600"}`}>
                          {t.result}
                        </span>
                      </div>
                      {t.test_date && (
                        <p className="text-xs text-gray-500">Tested: {new Date(t.test_date).toLocaleDateString()}</p>
                      )}
                      {t.observations && (
                        <p className="text-xs text-gray-600 mt-1">{t.observations}</p>
                      )}
                      {t.attachments_note && (
                        <p className="text-xs text-gray-400 mt-1 italic">Attachments: {t.attachments_note}</p>
                      )}
                    </div>
                    <button
                      onClick={() => openEdit(t)}
                      className="text-xs text-green-700 hover:text-green-800 font-medium flex-shrink-0"
                    >
                      Edit
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">{editing ? "Edit QC Test" : "Add QC Test"}</h2>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Test Name *</label>
                  <input
                    required
                    value={form.test_name}
                    onChange={e => setForm(f => ({ ...f, test_name: e.target.value }))}
                    placeholder="e.g. Tensile Strength Test"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Test Date</label>
                  <input
                    type="date"
                    value={form.test_date}
                    onChange={e => setForm(f => ({ ...f, test_date: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Result</label>
                  <select
                    value={form.result}
                    onChange={e => setForm(f => ({ ...f, result: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Pass">Pass</option>
                    <option value="Fail">Fail</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Observations</label>
                  <textarea
                    rows={3}
                    value={form.observations}
                    onChange={e => setForm(f => ({ ...f, observations: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 resize-none"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Attachments Note</label>
                  <input
                    value={form.attachments_note}
                    onChange={e => setForm(f => ({ ...f, attachments_note: e.target.value }))}
                    placeholder="Reference to physical docs or report IDs"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
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
                  {saving ? "Saving…" : editing ? "Update" : "Add Test"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
