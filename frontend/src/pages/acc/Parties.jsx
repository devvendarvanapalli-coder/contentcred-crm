import { useEffect, useState } from "react";
import { listParties, createParty, updateParty } from "../../api/accApi";
import { Plus, Edit, X, Search } from "lucide-react";

const BLANK = { name: "", party_type: "Customer", gstin: "", address: "", city: "", state: "", pincode: "", phone: "", email: "", opening_balance: 0 };

function PartyModal({ initial, onSave, onClose, saving }) {
  const [form, setForm] = useState(initial || BLANK);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-gray-900">{initial ? "Edit Party" : "Add Party"}</h2>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        <div className="space-y-3 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><label className="block text-xs font-medium text-gray-600 mb-1">Name *</label><input value={form.name} onChange={e => set("name", e.target.value)} required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Type</label><select value={form.party_type} onChange={e => set("party_type", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"><option>Customer</option><option>Supplier</option></select></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">GSTIN</label><input value={form.gstin} onChange={e => set("gstin", e.target.value)} placeholder="22AAAAA0000A1Z5" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Phone</label><input value={form.phone} onChange={e => set("phone", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Email</label><input type="email" value={form.email} onChange={e => set("email", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" /></div>
            <div className="col-span-2"><label className="block text-xs font-medium text-gray-600 mb-1">Address</label><input value={form.address} onChange={e => set("address", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">City</label><input value={form.city} onChange={e => set("city", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">State</label><input value={form.state} onChange={e => set("state", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Pincode</label><input value={form.pincode} onChange={e => set("pincode", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Opening Balance (₹)</label><input type="number" value={form.opening_balance} onChange={e => set("opening_balance", parseFloat(e.target.value) || 0)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" /></div>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm font-medium text-gray-700">Cancel</button>
          <button onClick={() => onSave(form)} disabled={saving || !form.name} className="flex-1 bg-purple-700 hover:bg-purple-800 disabled:opacity-60 text-white rounded-lg py-2 text-sm font-medium">{saving ? "Saving…" : "Save"}</button>
        </div>
      </div>
    </div>
  );
}

export default function Parties() {
  const [parties, setParties] = useState([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editParty, setEditParty] = useState(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    const params = {};
    if (search) params.search = search;
    if (typeFilter) params.party_type = typeFilter;
    listParties(params).then(setParties);
  }
  useEffect(() => { load(); }, [search, typeFilter]);

  async function handleSave(form) {
    setSaving(true);
    try {
      if (editParty) await updateParty(editParty.id, form);
      else await createParty(form);
      setShowForm(false); setEditParty(null); load();
    } finally { setSaving(false); }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Parties</h1><p className="text-gray-500 text-sm">{parties.length} parties</p></div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-purple-700 hover:bg-purple-800 text-white px-4 py-2 rounded-lg text-sm font-medium"><Plus size={16} /> Add Party</button>
      </div>
      <div className="flex gap-3">
        <div className="relative flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or GSTIN…" className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" /></div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"><option value="">All Types</option><option>Customer</option><option>Supplier</option></select>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>{["Name","Type","GSTIN","City / State","Phone","Balance"].map(h => <th key={h} className="text-left px-5 py-3 font-medium text-gray-600">{h}</th>)}<th className="text-right px-5 py-3 font-medium text-gray-600">Actions</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {parties.length === 0 ? <tr><td colSpan={7} className="py-10 text-center text-gray-400">No parties yet</td></tr> : parties.map(p => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-5 py-3 font-medium text-gray-900">{p.name}</td>
                <td className="px-5 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.party_type === "Customer" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"}`}>{p.party_type}</span></td>
                <td className="px-5 py-3 font-mono text-gray-600 text-xs">{p.gstin || "—"}</td>
                <td className="px-5 py-3 text-gray-600">{[p.city, p.state].filter(Boolean).join(", ") || "—"}</td>
                <td className="px-5 py-3 text-gray-600">{p.phone || "—"}</td>
                <td className="px-5 py-3 font-semibold text-gray-900">₹{Number(p.opening_balance || 0).toLocaleString("en-IN")}</td>
                <td className="px-5 py-3 text-right"><button onClick={() => setEditParty(p)} className="text-gray-400 hover:text-purple-600"><Edit size={16} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showForm && <PartyModal onSave={handleSave} onClose={() => setShowForm(false)} saving={saving} />}
      {editParty && <PartyModal initial={editParty} onSave={handleSave} onClose={() => setEditParty(null)} saving={saving} />}
    </div>
  );
}
