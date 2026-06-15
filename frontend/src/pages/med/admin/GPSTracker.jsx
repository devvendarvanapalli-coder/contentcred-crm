import { useEffect, useState } from "react";
import { getLatestLocations, getRepGPSHistory } from "../../../api/medApi";
import { MapPin, RefreshCw, Clock, Navigation } from "lucide-react";
import { format } from "date-fns";

export default function GPSTracker() {
  const [locations, setLocations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    setRefreshing(true);
    try {
      const data = await getLatestLocations();
      setLocations(data);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const iv = setInterval(load, 30000);
    return () => clearInterval(iv);
  }, []);

  async function selectRep(loc) {
    setSelected(loc);
    const h = await getRepGPSHistory(loc.rep_id);
    setHistory(h);
  }

  function mapsUrl(lat, lng) {
    return `https://www.google.com/maps?q=${lat},${lng}`;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">GPS Tracker</h1>
          <p className="text-gray-500 text-sm">Live locations of all sales reps (updates every 30s)</p>
        </div>
        <button
          onClick={load}
          disabled={refreshing}
          className="flex items-center gap-2 border border-gray-200 bg-white hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 transition-colors"
        >
          <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Sales Reps</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {loading ? (
              <p className="p-5 text-gray-400 text-sm">Loading…</p>
            ) : locations.length === 0 ? (
              <p className="p-5 text-gray-400 text-sm">No location data yet. Reps need to enable GPS in their dashboard.</p>
            ) : locations.map(loc => (
              <button
                key={loc.rep_id}
                onClick={() => selectRep(loc)}
                className={`w-full text-left px-5 py-4 hover:bg-gray-50 transition-colors ${selected?.rep_id === loc.rep_id ? "bg-blue-50" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm flex-shrink-0">
                    {loc.rep_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{loc.rep_name}</p>
                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                      <MapPin size={11} />
                      <span className="truncate">{loc.city ? `${loc.city}, ${loc.state}` : loc.state || "Unknown"}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                      <Clock size={11} />
                      <span>{loc.logged_at ? format(new Date(loc.logged_at), "dd MMM, hh:mm a") : "—"}</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-5">
          {selected ? (
            <>
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="font-semibold text-gray-900">{selected.rep_name}</h2>
                    <p className="text-sm text-gray-500">Territory: {selected.territory || "Unassigned"}</p>
                  </div>
                  <a
                    href={mapsUrl(selected.latitude, selected.longitude)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 bg-blue-700 hover:bg-blue-800 text-white text-sm px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <Navigation size={14} /> Open in Maps
                  </a>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-gray-500 text-xs mb-1">Current State</p>
                    <p className="font-medium text-gray-900">{selected.state || "Unknown"}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-gray-500 text-xs mb-1">City</p>
                    <p className="font-medium text-gray-900">{selected.city || "Unknown"}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-gray-500 text-xs mb-1">Coordinates</p>
                    <p className="font-medium text-gray-900 text-xs">{selected.latitude?.toFixed(5)}, {selected.longitude?.toFixed(5)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-gray-500 text-xs mb-1">Last Seen</p>
                    <p className="font-medium text-gray-900 text-xs">
                      {selected.logged_at ? format(new Date(selected.logged_at), "dd MMM yyyy, hh:mm a") : "—"}
                    </p>
                  </div>
                </div>
                {selected.address && (
                  <div className="mt-3 bg-gray-50 rounded-lg p-3">
                    <p className="text-gray-500 text-xs mb-1">Address</p>
                    <p className="text-sm text-gray-800">{selected.address}</p>
                  </div>
                )}
                <div className="mt-4 rounded-lg overflow-hidden border border-gray-200">
                  <iframe
                    title="rep-location"
                    width="100%"
                    height="250"
                    src={`https://maps.google.com/maps?q=${selected.latitude},${selected.longitude}&z=13&output=embed`}
                    style={{ border: 0 }}
                    allowFullScreen
                  />
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h2 className="font-semibold text-gray-800">Location History</h2>
                </div>
                <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
                  {history.map(h => (
                    <div key={h.id} className="flex items-center gap-4 px-5 py-3 text-sm">
                      <MapPin size={14} className="text-blue-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-800 truncate">{h.city ? `${h.city}, ${h.state}` : h.state || "Unknown"}</p>
                        <p className="text-xs text-gray-400">{h.address || `${h.latitude?.toFixed(4)}, ${h.longitude?.toFixed(4)}`}</p>
                      </div>
                      <p className="text-xs text-gray-400 flex-shrink-0">
                        {h.logged_at ? format(new Date(h.logged_at), "dd MMM, hh:mm a") : "—"}
                      </p>
                    </div>
                  ))}
                  {history.length === 0 && (
                    <p className="p-5 text-gray-400 text-sm">No history available</p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 h-64 flex flex-col items-center justify-center text-gray-400">
              <MapPin size={40} className="mb-3 opacity-30" />
              <p className="text-sm">Select a sales rep to view their location</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
