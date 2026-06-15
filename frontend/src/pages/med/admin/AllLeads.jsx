import { useEffect, useState } from "react";
import { listLeads, listUsers, deleteLead } from "../../../api/medApi";
import { Search, Plus, Trash2, Edit, Eye } from "lucide-react";
import { Link } from "react-router-dom";

const STATUS_BADGE = {
  New: "bg-blue-100 text-blue-700",
  Contacted: "bg-yellow-100 text-yellow-700",
  Interested: "bg-emerald-100 text-emerald-700",
  "Demo Done": "bg-purple-100 text-purple-700",
  "Order Placed": "bg-green-100 text-green-700",
  Lost: "bg-red-100 text-red-600",
};

export default function AllLeads() {
  const [leads, setLeads] = useState([]);
  const [total, setTotal] = useState(0);
  const [reps, setReps] = useState([]);
  const [filters, setFilters] = useState({ search: "", status: "", state: "", rep_id: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listUsers().then(u => setReps(u.filter(r => r.role === "sales_rep")));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (filters.search) params.search = filters.search;
    if (filters.status) params.status = filters.status;
    if (filters.state) params.state = filters.state;
    if (filters.rep_id) params.rep_id = filters.rep_id;
    listLeads(params)
      .then(d => { setLeads(d.leads); setTotal(d.total); })
      .finally(() => setLoading(false));
  }, [filters]);

  async function handleDelete(id) {
    if (!confirm("Delete this lead?")) return;
    await deleteLead(id);
    setLeads(prev => prev.filter(l => l.id !== id));
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Leads</h1>
          <p className="text-gray-500 text-sm">{total} total leads</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
            placeholder="Search hospital…"
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filters.status}
          onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Status</option>
          {["New","Contacted","Interested","Demo Done","Order Placed","Lost"].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={filters.rep_id}
          onChange={e => setFilters(f => ({ ...f, rep_id: e.target.value }))}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Reps</option>
          {reps.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <input
          value={filters.state}
          onChange={e => setFilters(f => ({ ...f, state: e.target.value }))}
          placeholder="Filter by state…"
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Hospital</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Contact</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">City / State</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Type</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Priority</th>
                <th className="text-right px-5 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={7} className="py-10 text-center text-gray-400">Loading…</td></tr>
              ) : leads.length === 0 ? (
                <tr><td colSpan={7} className="py-10 text-center text-gray-400">No leads found</td></tr>
              ) : leads.map(lead => (
                <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-900">{lead.hospital_name}</p>
                    <p className="text-xs text-gray-500">{lead.specialty || "—"}</p>
                  </td>
                  <td className="px-5 py-3">
                    <p className="text-gray-800">{lead.contact_person || "—"}</p>
                    <p className="text-xs text-gray-500">{lead.phone || ""}</p>
                  </td>
                  <td className="px-5 py-3 text-gray-700">{[lead.city, lead.state].filter(Boolean).join(", ") || "—"}</td>
                  <td className="px-5 py-3 text-gray-700">{lead.hospital_type || "—"}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[lead.status] || "bg-gray-100 text-gray-600"}`}>
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-medium ${lead.priority === "High" ? "text-red-600" : lead.priority === "Medium" ? "text-yellow-600" : "text-gray-500"}`}>
                      {lead.priority}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => handleDelete(lead.id)} className="text-red-400 hover:text-red-600">
                        <Trash2 size={16} />
                      </button>
                    </div>
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
