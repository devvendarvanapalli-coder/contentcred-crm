import { useEffect, useState } from "react";
import { listUsers, registerUser, updateUser } from "../../../api/medApi";
import { Plus, Edit, X } from "lucide-react";

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function SalesReps() {
  const [reps, setReps] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editRep, setEditRep] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", territory: "", role: "sales_rep" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const users = await listUsers();
    setReps(users);
  }

  useEffect(() => { load(); }, []);

  function openAdd() {
    setForm({ name: "", email: "", phone: "", password: "", territory: "", role: "sales_rep" });
    setError("");
    setShowAdd(true);
  }

  function openEdit(rep) {
    setEditRep(rep);
    setForm({ name: rep.name, phone: rep.phone, territory: rep.territory, is_active: rep.is_active, role: rep.role });
    setError("");
  }

  async function handleAdd(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await registerUser(form);
      setShowAdd(false);
      load();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to add rep");
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await updateUser(editRep.id, form);
      setEditRep(null);
      load();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to update");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Reps</h1>
          <p className="text-gray-500 text-sm">{reps.length} users total</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} /> Add Rep
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Email</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Phone</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Territory</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Role</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Status</th>
                <th className="text-right px-5 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reps.map(rep => (
                <tr key={rep.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">{rep.name}</td>
                  <td className="px-5 py-3 text-gray-700">{rep.email}</td>
                  <td className="px-5 py-3 text-gray-700">{rep.phone || "—"}</td>
                  <td className="px-5 py-3 text-gray-700">{rep.territory || "—"}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${rep.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                      {rep.role === "admin" ? "Admin" : "Sales Rep"}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${rep.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                      {rep.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button onClick={() => openEdit(rep)} className="text-gray-500 hover:text-blue-600">
                      <Edit size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && (
        <Modal title="Add Sales Rep" onClose={() => setShowAdd(false)}>
          <form onSubmit={handleAdd} className="space-y-4">
            {["name", "email", "phone", "password", "territory"].map(f => (
              <div key={f}>
                <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">{f}</label>
                <input
                  type={f === "password" ? "password" : f === "email" ? "email" : "text"}
                  value={form[f] || ""}
                  onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))}
                  required={["name","email","password"].includes(f)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="sales_rep">Sales Rep</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setShowAdd(false)}
                className="flex-1 border border-gray-200 rounded-lg py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button type="submit" disabled={saving}
                className="flex-1 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white rounded-lg py-2 text-sm font-medium">
                {saving ? "Adding…" : "Add Rep"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {editRep && (
        <Modal title={`Edit — ${editRep.name}`} onClose={() => setEditRep(null)}>
          <form onSubmit={handleEdit} className="space-y-4">
            {["name", "phone", "territory"].map(f => (
              <div key={f}>
                <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">{f}</label>
                <input value={form[f] || ""} onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            ))}
            <div className="flex items-center gap-3">
              <input type="checkbox" id="active" checked={form.is_active ?? true}
                onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} className="w-4 h-4" />
              <label htmlFor="active" className="text-sm text-gray-700">Active account</label>
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setEditRep(null)}
                className="flex-1 border border-gray-200 rounded-lg py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={saving}
                className="flex-1 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white rounded-lg py-2 text-sm font-medium">
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
