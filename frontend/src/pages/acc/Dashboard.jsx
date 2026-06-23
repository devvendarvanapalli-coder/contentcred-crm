import { useEffect, useState } from "react";
import { getAccDashboard, getGSTSummary } from "../../api/accApi";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { FileText, AlertCircle, TrendingUp, CreditCard } from "lucide-react";

function KPI({ label, value, icon: Icon, color }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  );
}

export default function AccDashboard() {
  const [data, setData] = useState(null);
  const [gst, setGst] = useState(null);

  useEffect(() => {
    getAccDashboard().then(setData);
    getGSTSummary().then(setGst);
  }, []);

  if (!data) return <div className="p-8 flex justify-center"><div className="animate-spin w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full" /></div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Accounting Dashboard</h1>
        <p className="text-gray-500 text-sm">MediThread Financial Overview</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI label="Total Receivables" value={`₹${Number(data.total_receivables).toLocaleString("en-IN")}`} icon={TrendingUp} color="bg-purple-600" />
        <KPI label="Overdue Invoices" value={data.overdue_invoices} icon={AlertCircle} color="bg-red-500" />
        <KPI label="GST This Month" value={`₹${Number((gst?.total_gst) || 0).toLocaleString("en-IN")}`} icon={FileText} color="bg-orange-500" />
        <KPI label="Recent Invoices" value={data.recent_invoices?.length || 0} icon={CreditCard} color="bg-green-600" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Revenue (Last 6 Months)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.monthly_revenue || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={v => `₹${Number(v).toLocaleString("en-IN")}`} />
              <Bar dataKey="revenue" fill="#7c3aed" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-800 mb-4">GST Summary This Month</h2>
          {gst && (
            <div className="space-y-3">
              {[["CGST Collected", gst.total_cgst, "bg-blue-100 text-blue-700"], ["SGST Collected", gst.total_sgst, "bg-green-100 text-green-700"], ["IGST Collected", gst.total_igst, "bg-orange-100 text-orange-700"]].map(([label, val, cls]) => (
                <div key={label} className="flex items-center justify-between px-4 py-3 rounded-lg bg-gray-50">
                  <span className="text-sm text-gray-700">{label}</span>
                  <span className={`text-sm font-semibold px-3 py-1 rounded-full ${cls}`}>₹{Number(val).toLocaleString("en-IN")}</span>
                </div>
              ))}
              <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-purple-50 border border-purple-200">
                <span className="text-sm font-semibold text-purple-800">Total GST</span>
                <span className="text-sm font-bold text-purple-800">₹{Number(gst.total_gst).toLocaleString("en-IN")}</span>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100"><h2 className="font-semibold text-gray-800">Recent Invoices</h2></div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-5 py-3 font-medium text-gray-600">Invoice #</th>
              <th className="text-left px-5 py-3 font-medium text-gray-600">Party</th>
              <th className="text-left px-5 py-3 font-medium text-gray-600">Amount</th>
              <th className="text-left px-5 py-3 font-medium text-gray-600">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(data.recent_invoices || []).map(inv => (
              <tr key={inv.id} className="hover:bg-gray-50">
                <td className="px-5 py-3 font-mono text-gray-800">{inv.invoice_number}</td>
                <td className="px-5 py-3 text-gray-700">{inv.party_name}</td>
                <td className="px-5 py-3 font-semibold">₹{Number(inv.total_amount).toLocaleString("en-IN")}</td>
                <td className="px-5 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${inv.payment_status === "Paid" ? "bg-green-100 text-green-700" : inv.payment_status === "Partial" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-600"}`}>{inv.payment_status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
