import { useEffect, useState } from "react";
import { getGSTSummary, getGSTR1 } from "../../api/accApi";

const inp = "border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400";
function fmt(n) { return "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 }); }

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export default function GSTReports() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [activeTab, setActiveTab] = useState("summary");
  const [summary, setSummary] = useState(null);
  const [gstr1, setGstr1] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getGSTSummary({ month, year }),
      getGSTR1({ month, year }),
    ]).then(([s, g]) => { setSummary(s); setGstr1(g); })
      .finally(() => setLoading(false));
  }, [month, year]);

  const years = [];
  for (let y = now.getFullYear(); y >= now.getFullYear() - 3; y--) years.push(y);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <h1 className="text-2xl font-bold text-gray-800">GST Reports</h1>

      {/* Period selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <select className={inp} value={month} onChange={e => setMonth(Number(e.target.value))}>
          {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
        </select>
        <select className={inp} value={year} onChange={e => setYear(Number(e.target.value))}>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <span className="text-sm text-gray-500">Period: {MONTHS[month - 1]} {year}</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {[["summary", "GST Summary"], ["gstr1", "GSTR-1"]].map(([id, label]) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`px-4 py-1.5 text-sm rounded-md font-medium transition-colors ${activeTab === id ? "bg-white text-purple-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            {label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center h-32">
          <div className="w-7 h-7 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && activeTab === "summary" && summary && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Output Tax */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Output Tax (Sales)</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Taxable Value</span><strong>{fmt(summary.output?.taxable_value)}</strong></div>
                <div className="flex justify-between"><span className="text-gray-500">CGST (9%)</span><strong>{fmt(summary.output?.cgst)}</strong></div>
                <div className="flex justify-between"><span className="text-gray-500">SGST (9%)</span><strong>{fmt(summary.output?.sgst)}</strong></div>
                <div className="flex justify-between"><span className="text-gray-500">IGST (18%)</span><strong>{fmt(summary.output?.igst)}</strong></div>
                <div className="flex justify-between border-t pt-2 font-semibold text-purple-700"><span>Total Output GST</span><span>{fmt(summary.output?.total_gst)}</span></div>
              </div>
            </div>

            {/* Input Tax */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Input Tax Credit (Purchases)</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Taxable Value</span><strong>{fmt(summary.input?.taxable_value)}</strong></div>
                <div className="flex justify-between"><span className="text-gray-500">Total ITC</span><strong>{fmt(summary.input?.total_gst)}</strong></div>
              </div>
            </div>
          </div>

          {/* Net */}
          <div className="bg-purple-50 border border-purple-100 rounded-xl p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-700 font-medium">Net GST Payable</p>
              <p className="text-xs text-purple-500 mt-0.5">Output GST − Input Tax Credit</p>
            </div>
            <p className={`text-2xl font-bold ${summary.net_gst_payable > 0 ? "text-purple-800" : "text-green-700"}`}>
              {fmt(summary.net_gst_payable)}
            </p>
          </div>

          <div className="text-xs text-gray-400">
            Based on {summary.invoice_count} invoice(s) and {summary.purchase_count} received PO(s) for {MONTHS[month - 1]} {year}.
          </div>
        </div>
      )}

      {!loading && activeTab === "gstr1" && gstr1 && (
        <div className="space-y-4">
          {/* B2B */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-3 border-b bg-gray-50">
              <h2 className="text-sm font-semibold text-gray-700">B2B Invoices (Registered Customers)</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-gray-500 bg-gray-50">
                  <tr>
                    {["Invoice #", "Customer", "GSTIN", "Date", "State", "Taxable", "CGST", "SGST", "IGST", "Total"].map(h => (
                      <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(gstr1.b2b || []).map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-mono text-purple-700 text-xs">{row.invoice_number}</td>
                      <td className="px-3 py-2 font-medium">{row.party}</td>
                      <td className="px-3 py-2 font-mono text-xs">{row.gstin}</td>
                      <td className="px-3 py-2 text-gray-600 text-xs">{row.date ? new Date(row.date).toLocaleDateString("en-IN") : "—"}</td>
                      <td className="px-3 py-2 text-gray-600">{row.state || "—"}</td>
                      <td className="px-3 py-2">{fmt(row.subtotal)}</td>
                      <td className="px-3 py-2">{fmt(row.cgst)}</td>
                      <td className="px-3 py-2">{fmt(row.sgst)}</td>
                      <td className="px-3 py-2">{fmt(row.igst)}</td>
                      <td className="px-3 py-2 font-semibold">{fmt(row.total)}</td>
                    </tr>
                  ))}
                  {!(gstr1.b2b?.length) && (
                    <tr><td colSpan={10} className="px-4 py-6 text-center text-gray-400">No B2B invoices</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* B2C */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">B2C (Unregistered Customers) — Summary</h2>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
              {[["Taxable", gstr1.b2c?.taxable], ["CGST", gstr1.b2c?.cgst], ["SGST", gstr1.b2c?.sgst], ["IGST", gstr1.b2c?.igst], ["Total", gstr1.b2c?.total]].map(([label, val]) => (
                <div key={label} className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="font-semibold">{fmt(val)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* HSN Summary */}
          {gstr1.hsn_summary?.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-3 border-b bg-gray-50">
                <h2 className="text-sm font-semibold text-gray-700">HSN-wise Summary</h2>
              </div>
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-gray-500 bg-gray-50">
                  <tr>
                    {["HSN Code", "Description", "GST Rate", "Taxable Value"].map(h => (
                      <th key={h} className="px-4 py-2 text-left font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {gstr1.hsn_summary.map((row, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2 font-mono text-xs">{row.hsn_code}</td>
                      <td className="px-4 py-2">{row.description}</td>
                      <td className="px-4 py-2">{row.gst_rate}%</td>
                      <td className="px-4 py-2 font-semibold">{fmt(row.taxable_value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
