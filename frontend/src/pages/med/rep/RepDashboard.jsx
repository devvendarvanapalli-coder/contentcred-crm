import { useEffect, useState, useCallback } from "react";
import { getRepReport, listLeads, pingGPS } from "../../../api/medApi";
import { useAuth } from "../../../context/AuthContext";
import { MapPin, FileText, ShoppingCart, Navigation, CheckCircle, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";

export default function RepDashboard() {
  const { user } = useAuth();
  const [report, setReport] = useState(null);
  const [recentLeads, setRecentLeads] = useState([]);
  const [gpsStatus, setGpsStatus] = useState("idle");
  const [gpsInfo, setGpsInfo] = useState(null);

  useEffect(() => {
    if (!user) return;
    getRepReport(user.id).then(setReport);
    listLeads({ limit: 5 }).then(d => setRecentLeads(d.leads || []));
  }, [user]);

  const sendGPS = useCallback(async () => {
    if (!navigator.geolocation) {
      setGpsStatus("disabled");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        let state = "", city = "", address = "";
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { "Accept-Language": "en" } }
          );
          const geo = await res.json();
          state = geo.address?.state || geo.address?.["state_district"] || "";
          city = geo.address?.city || geo.address?.town || geo.address?.village || "";
          address = geo.display_name || "";
        } catch (_) {}
        await pingGPS({ latitude, longitude, accuracy, state, city, address });
        setGpsInfo({ latitude, longitude, state, city });
        setGpsStatus("tracking");
      },
      (err) => {
        console.error(err);
        setGpsStatus("error");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  useEffect(() => {
    sendGPS();
    const iv = setInterval(sendGPS, 5 * 60 * 1000);
    return () => clearInterval(iv);
  }, [sendGPS]);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Hello, {user?.name} 👋</h1>
        <p className="text-gray-500 text-sm">Territory: {user?.territory || "Not assigned"}</p>
      </div>

      <div className={`rounded-xl border p-4 flex items-center gap-3 ${
        gpsStatus === "tracking" ? "bg-green-50 border-green-200" :
        gpsStatus === "error" ? "bg-red-50 border-red-200" :
        gpsStatus === "disabled" ? "bg-gray-50 border-gray-200" :
        "bg-blue-50 border-blue-200"
      }`}>
        {gpsStatus === "tracking" ? <CheckCircle size={20} className="text-green-600 flex-shrink-0" /> :
         gpsStatus === "error" ? <AlertCircle size={20} className="text-red-500 flex-shrink-0" /> :
         <Navigation size={20} className="text-blue-600 flex-shrink-0" />}
        <div className="flex-1">
          {gpsStatus === "tracking" && gpsInfo ? (
            <p className="text-sm text-green-800 font-medium">
              GPS Active — {gpsInfo.city ? `${gpsInfo.city}, ` : ""}{gpsInfo.state || "Location recorded"}
            </p>
          ) : gpsStatus === "error" ? (
            <p className="text-sm text-red-700 font-medium">GPS permission denied. Please allow location access.</p>
          ) : gpsStatus === "disabled" ? (
            <p className="text-sm text-gray-600">GPS not supported on this device.</p>
          ) : (
            <p className="text-sm text-blue-800">Getting your location…</p>
          )}
          <p className="text-xs text-gray-500 mt-0.5">Your location is shared with admin. Auto-updates every 5 minutes.</p>
        </div>
        <button onClick={sendGPS} className="text-xs text-gray-500 underline">Update now</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "My Leads", value: report?.total_leads, icon: FileText, color: "bg-blue-600", to: "/med/rep/leads" },
          { label: "Visits", value: report?.total_visits, icon: MapPin, color: "bg-teal-600", to: "/med/rep/visits" },
          { label: "Orders", value: report?.total_orders, icon: ShoppingCart, color: "bg-orange-500", to: "/med/rep/orders" },
          { label: "Revenue", value: `₹${Number(report?.total_revenue || 0).toLocaleString("en-IN")}`, icon: Navigation, color: "bg-green-600" },
        ].map(k => (
          <Link key={k.label} to={k.to || "#"} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3 hover:shadow-sm transition-shadow">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${k.color}`}>
              <k.icon size={18} className="text-white" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{k.value ?? "—"}</p>
              <p className="text-xs text-gray-500">{k.label}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Recent Leads</h2>
          <Link to="/med/rep/leads" className="text-blue-600 text-sm hover:underline">View all</Link>
        </div>
        <div className="divide-y divide-gray-100">
          {recentLeads.length === 0 ? (
            <p className="p-5 text-gray-400 text-sm">No leads yet. <Link to="/med/rep/leads" className="text-blue-600">Add your first lead</Link></p>
          ) : recentLeads.map(lead => (
            <div key={lead.id} className="flex items-center gap-4 px-5 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{lead.hospital_name}</p>
                <p className="text-xs text-gray-500 truncate">{[lead.city, lead.state].filter(Boolean).join(", ") || "—"}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                lead.status === "Order Placed" ? "bg-green-100 text-green-700" :
                lead.status === "Interested" ? "bg-emerald-100 text-emerald-700" :
                lead.status === "Lost" ? "bg-red-100 text-red-600" :
                "bg-blue-100 text-blue-700"
              }`}>{lead.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
