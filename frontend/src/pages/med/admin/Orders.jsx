import { useEffect, useState } from "react";
import { listOrders, updateOrder } from "../../../api/medApi";
import { format } from "date-fns";

const STATUS_COLORS = { Pending: "bg-yellow-100 text-yellow-700", Dispatched: "bg-blue-100 text-blue-700", Delivered: "bg-green-100 text-green-700", Cancelled: "bg-red-100 text-red-600" };
const PAY_COLORS = { Unpaid: "bg-red-100 text-red-600", Partial: "bg-yellow-100 text-yellow-700", Paid: "bg-green-100 text-green-700" };

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const data = await listOrders();
    setOrders(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function updateStatus(id, field, value) {
    await updateOrder(id, { [field]: value });
    setOrders(prev => prev.map(o => o.id === id ? { ...o, [field]: value } : o));
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">All Orders</h1>
        <p className="text-gray-500 text-sm">{orders.length} orders total</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Invoice</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Lead ID</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Date</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Amount</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Order Status</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Payment</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={7} className="py-10 text-center text-gray-400">Loading…</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={7} className="py-10 text-center text-gray-400">No orders yet</td></tr>
              ) : orders.map(o => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-mono text-gray-800">{o.invoice_number || `#${o.id}`}</td>
                  <td className="px-5 py-3 text-gray-700">Lead #{o.lead_id}</td>
                  <td className="px-5 py-3 text-gray-700">{o.order_date ? format(new Date(o.order_date), "dd MMM yyyy") : "—"}</td>
                  <td className="px-5 py-3 font-semibold text-gray-900">₹{Number(o.total_amount || 0).toLocaleString("en-IN")}</td>
                  <td className="px-5 py-3">
                    <select
                      value={o.status}
                      onChange={e => updateStatus(o.id, "status", e.target.value)}
                      className={`text-xs font-medium px-2 py-0.5 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-400 ${STATUS_COLORS[o.status] || "bg-gray-100 text-gray-600"}`}
                    >
                      {["Pending","Dispatched","Delivered","Cancelled"].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="px-5 py-3">
                    <select
                      value={o.payment_status}
                      onChange={e => updateStatus(o.id, "payment_status", e.target.value)}
                      className={`text-xs font-medium px-2 py-0.5 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-400 ${PAY_COLORS[o.payment_status] || "bg-gray-100 text-gray-600"}`}
                    >
                      {["Unpaid","Partial","Paid"].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="px-5 py-3 text-gray-500 max-w-xs truncate">{o.notes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
