import { useEffect, useState } from "react";
import { listLeads, createLead, updateLead } from "../../../api/medApi";
import { Plus, Edit, X, Search } from "lucide-react";

const STATUSES = ["New","Contacted","Interested","Demo Done","Order Placed","Lost"];
const PRIORITIES = ["Low","Medium","High"];
const HOSPITAL_TYPES = ["Government","Private","Clinic","Nursing Home","Specialty Hospital"];

const STATUS_BADGE = {
  New: "bg-blue-100 text-blue-700",
  Contacted: "bg-yellow-100 text-yellow-700",
  Interested: "bg-emerald-100 text-emerald-700",
  "Demo Done": "bg-purple-100 text-purple-700",
  "Order Placed": "bg-green-100 text-green-700",
  Lost: "bg-red-100 text-red-600",
};

const BLANK = {
  hospital_name: "", contact_person: "", designation: "", phone: "", email: "",
  address: "", city: "", state: "", pincode: "", hospital_type: "", specialty: "",
  bed_count: 0, monthly_suture_usage: "", current_supplier: "", products_interested: "",
  status: "New", priority: "Medium", notes: "",
};

function LeadForm({ initial, onSave, onClose, saving }) {
  const [form, setForm] = useState(initial || BLANK);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">{initial ? "Edit Lead" : "Add New Lead"}</h2>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Hospital Info</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Hospital Name *</label>
              <input value={form.hospital_name} onChange={e => set("hospital_name", e.target.value)} required className="input" />
            </div>
            <div>
              <label className="label">Type</label>
              <select value={form.hospital_type} onChange={e => set("hospital_type", e.target.value)} className="input">
                <option value="">Select…</option>
                {HOSPITAL_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Specialty</label>
              <input value={form.specialty} onChange={e => set("specialty", e.target.value)} placeholder="General Surgery, Ortho…" className="input" />
            </div>
            <div>
              <label className="label">Bed Count</label>
              <input type="number" value={form.bed_count} onChange={e => set("bed_count", parseInt(e.target.value) || 0)} className="input" />
            </div>
            <div>
              <label className="label">Monthly Suture Usage</label>
              <input value={form.monthly_suture_usage} onChange={e => set("monthly_suture_usage", e.target.value)} placeholder="Low / ~20 boxes / High" className="input" />
            </div>
          </div>

          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider pt-2">Contact</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Contact Person</label>
              <input value={form.contact_person} onChange={e => set("contact_person", e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">Designation</label>
              <input value={form.designation} onChange={e => set("designation", e.target.value)} placeholder="Purchase Manager, Surgeon…" className="input" />
            </div>
            <div>
              <label className="label">Phone</label>
              <input value={form.phone} onChange={e => set("phone", e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" value={form.email} onChange={e => set("email", e.target.value)} className="input" />
            </div>
          </div>

          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider pt-2">Location</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Address</label>
              <input value={form.address} onChange={e => set("address", e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">City</label>
              <input value={form.city} onChange={e => set("city", e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">State</label>
              <input value={form.state} onChange={e => set("state", e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">Pincode</label>
              <input value={form.pincode} onChange={e => set("pincode", e.target.value)} className="input" />
            </div>
          </div>

          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider pt-2">Sales Info</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Current Supplier</label>
              <input value={form.current_supplier} onChange={e => set("current_supplier", e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">Products Interested</label>
              <input value={form.products_interested} onChange={e => set("products_interested", e.target.value)} placeholder="Absorbable, Non-absorbable…" className="input" />
            </div>
            <div>
              <label className="label">Status</label>
              <select value={form.status} onChange={e => set("status", e.target.value)} className="input">
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Priority</label>
              <select value={form.priority} onChange={e => set("priority", e.target.value)} className="input">
                {PRIORITIES.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="label">Notes</label>
              <textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={3} className="input" />
            </div>
          </div>
        </div>
        <div className="flex gap-3 p-6 border-t border-gray-100">
          <button onClick={onClose} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={() => onSave(form)} disabled={saving || !form.hospital_name}
            className="flex-1 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white rounded-lg py-2 text-sm font-medium">
            {saving ? "Saving…" : "Save Lead"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RepLeads() {
  const [leads, setLeads] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editLead, setEditLead] = useState(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    const params = search ? { search } : {};
    const d = await listLeads(params);
    setLeads(d.leads);
    setTotal(d.total);
  }

  useEffect(() => { load(); }, [search]);

  async function handleSave(form) {
    setSaving(true);
    try {
      if (editLead) {
        await updateLead(editLead.id, form);
      } else {
        await createLead(form);
      }
      setShowForm(false);
      setEditLead(null);
      load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <style>{`.label{display:block;font-size:.75rem;font-weight:500;color:#4b5563;margin-bottom:.25rem}.input{width:100%;border:1px solid #e5e7eb;border-radius:.5rem;padding:.5rem .75rem;font-size:.875rem;outline:none}.input:focus{ring:2px solid #3b82f6}`}</style>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Leads</h1>
          <p className="text-gray-500 text-sm">{total} leads</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Plus size={16} /> Add Lead
        </button>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search hospital…"
          className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      <div className="space-y-3">
        {leads.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 py-12 text-center">
            <p className="text-gray-400">No leads yet. Add your first lead!</p>
          </div>
        ) : leads.map(lead => (
          <div key={lead.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-gray-900">{lead.hospital_name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[lead.status] || "bg-gray-100 text-gray-600"}`}>{lead.status}</span>
                  <span className={`text-xs font-medium ${lead.priority === "High" ? "text-red-600" : lead.priority === "Low" ? "text-gray-400" : "text-yellow-600"}`}>● {lead.priority}</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{lead.contact_person}{lead.designation ? ` · ${lead.designation}` : ""}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">
                  {lead.phone && <span>📞 {lead.phone}</span>}
                  {lead.city && <span>📍 {[lead.city, lead.state].filter(Boolean).join(", ")}</span>}
                  {lead.hospital_type && <span>🏥 {lead.hospital_type}</span>}
                  {lead.specialty && <span>🔬 {lead.specialty}</span>}
                </div>
                {lead.notes && <p className="text-xs text-gray-400 mt-2 line-clamp-2">{lead.notes}</p>}
              </div>
              <button onClick={() => { setEditLead(lead); setShowForm(false); }}
                className="text-gray-400 hover:text-blue-600 flex-shrink-0">
                <Edit size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {showForm && <LeadForm onSave={handleSave} onClose={() => setShowForm(false)} saving={saving} />}
      {editLead && <LeadForm initial={editLead} onSave={handleSave} onClose={() => setEditLead(null)} saving={saving} />}
    </div>
  );
}
