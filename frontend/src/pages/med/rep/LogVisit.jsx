import { useEffect, useState } from "react";
import { listLeads, createVisit, listVisits } from "../../../api/medApi";
import { MapPin, CheckCircle } from "lucide-react";
import { format } from "date-fns";

const PURPOSES = ["Introduction","Follow-up","Demo","Sample Distribution","Order Collection","Technical Support"];
const OUTCOMES = ["Interested","Not Available","Follow-up Needed","Order Placed","Not Interested","Will Decide Later"];

export default function LogVisit() {
  const [leads, setLeads] = useState([]);
  const [visits, setVisits] = useState([]);
  const [form, setForm] = useState({
    lead_id: "",
    visit_date: new Date().toISOString().slice(0, 16),
    purpose: "Follow-up",
    outcome: "",
    next_followup: "",
    notes: "",
    latitude: null,
    longitude: null,
    location_state: "",
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);

  useEffect(() => {
    listLeads({ limit: 200 }).then(d => setLeads(d.leads || []));
    listVisits().then(setVisits);
  }, []);

  function captureGPS() {
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        let state = "";
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`, { headers: { "Accept-Language": "en" } });
          const geo = await res.json();
          state = geo.address?.state || "";
        } catch (_) {}
        setForm(f => ({ ...f, latitude, longitude, location_state: state }));
        setGpsLoading(false);
      },
      () => setGpsLoading(false),
      { timeout: 10000 }
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.lead_id) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        lead_id: parseInt(form.lead_id),
        visit_date: new Date(form.visit_date).toISOString(),
        next_followup: form.next_followup ? new Date(form.next_followup).toISOString() : null,
      };
      await createVisit(payload);
      setSuccess(true);
      setForm(f => ({ ...f, lead_id: "", outcome: "", notes: "", next_followup: "" }));
      listVisits().then(setVisits);
      setTimeout(() => setSuccess(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Log a Visit</h1>

      {success && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3">
          <CheckCircle size={18} /> Visit logged successfully!
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Hospital / Lead *</label>
          <select value={form.lead_id} onChange={e => setForm(f => ({ ...f, lead_id: e.target.value }))} required
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Select a lead…</option>
            {leads.map(l => <option key={l.id} value={l.id}>{l.hospital_name} — {l.city || l.state}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Visit Date & Time *</label>
            <input type="datetime-local" value={form.visit_date}
              onChange={e => setForm(f => ({ ...f, visit_date: e.target.value }))} required
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Purpose</label>
            <select value={form.purpose} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {PURPOSES.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Outcome</label>
            <select value={form.outcome} onChange={e => setForm(f => ({ ...f, outcome: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Select outcome…</option>
              {OUTCOMES.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Next Follow-up</label>
            <input type="datetime-local" value={form.next_followup}
              onChange={e => setForm(f => ({ ...f, next_followup: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-3">
          <MapPin size={18} className={form.latitude ? "text-green-600" : "text-gray-400"} />
          <div className="flex-1 text-sm">
            {form.latitude ? (
              <span className="text-green-700">Location captured — {form.location_state || `${form.latitude?.toFixed(4)}, ${form.longitude?.toFixed(4)}`}</span>
            ) : (
              <span className="text-gray-500">Attach current GPS location to this visit</span>
            )}
          </div>
          <button type="button" onClick={captureGPS} disabled={gpsLoading}
            className="text-sm text-blue-700 font-medium hover:underline disabled:opacity-50">
            {gpsLoading ? "Getting…" : form.latitude ? "Update" : "Capture GPS"}
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3}
            placeholder="What was discussed? Any commitments made?"
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <button type="submit" disabled={saving || !form.lead_id}
          className="w-full bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors">
          {saving ? "Saving…" : "Log Visit"}
        </button>
      </form>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Recent Visits</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {visits.length === 0 ? (
            <p className="p-5 text-gray-400 text-sm">No visits logged yet</p>
          ) : visits.slice(0, 10).map(v => (
            <div key={v.id} className="px-5 py-4 flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                <MapPin size={15} className="text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{v.purpose}</p>
                <p className="text-xs text-gray-500">{v.outcome || "—"}</p>
                {v.notes && <p className="text-xs text-gray-400 mt-1 line-clamp-1">{v.notes}</p>}
              </div>
              <div className="text-right text-xs text-gray-400 flex-shrink-0">
                <p>{v.visit_date ? format(new Date(v.visit_date), "dd MMM yyyy") : "—"}</p>
                {v.location_state && <p className="text-blue-500 mt-0.5">{v.location_state}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
