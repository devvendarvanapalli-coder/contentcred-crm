import { useEffect, useState } from "react";
import { getGSTR1, getGSTSummary } from "../../api/accApi";

export default function GSTReports() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [gstr1, setGstr1] = useState(null);
  const [summary, setSummary] = useState(null);

  useEffect(() => { getGSTSummary().then(setSummary); }, []);
  useEffect(() => { getGSTR1(month, year).then(setGstr1); }, [month, year]);

  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-900">GST Reports</h1><p className="text-gray-500 text-sm">GSTR-1 style sales report for filing</p></div>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[["CGST Collected", summary.total_cgst, "bg-blue-100 text-blue-700"], ["SGST Collected", summary.total_sgst, "bg-green-100 text-green-700"], ["IGST Collected", summary.total_igst, "bg-orange-100 text-orange-700"], ["Total GST", summary.total_gst, "bg-purple-100 text-purple-700"]].map(([label, val, cls]) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 p-5">
              <p className={`text-xl font-bold ${cls.split(" ")[1]}`}>₹{Number(val).toLocaleString("en-IN")}</p>
              <p className="text-sm text-gray-500 mt-1">{label} (This Month)</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3 items-center">
        <select value={month} onChange={e => setMonth(parseInt(e.target.value))} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
          {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <select value={year} onChange={e => setYear(parseInt(e.target.value))} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
          {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <span className="text-sm text-gray-500">Selected: {months[month - 1]} {year}</span>
      </div>

      {gstr1 && (
        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100"><h2 className="font-semibold text-gray-800">HSN-wise Summary</h2></div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200"><tr>{["HSN Code","Description","GST Rate","Taxable Value","CGST","SGST","IGST"].map(h => <th key={h} className="text-left px-5 py-3 font-medium text-gray-600">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-100">
                {gstr1.hsn_summary.length === 0 ? <tr><td colSpan={7} className="py-8 text-center text-gray-400">No sales in this period</td></tr> : gstr1.hsn_summary.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-mono text-xs text-gray-700">{row.hsn_code}</td>
                    <td className="px-5 py-3 text-gray-800">{row.description}</td>
                    <td className="px-5 py-3 text-gray-600">{row.gst_rate}%</td>
                    <td className="px-5 py-3 font-medium text-gray-900">₹{Number(row.taxable_value).toLocaleString("en-IN")}</td>
                    <td className="px-5 py-3 text-gray-700">₹{Number(row.cgst || 0).toLocaleString("en-IN")}</td>
                    <td className="px-5 py-3 text-gray-700">₹{Number(row.sgst || 0).toLocaleString("en-IN")}</td>
                    <td className="px-5 py-3 text-gray-700">₹{Number(row.igst || 0).toLocaleString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-800 mb-3">B2B Sales (Registered Parties)</h2>
              {gstr1.b2b.length === 0 ? <p className="text-gray-400 text-sm">No B2B invoices</p> : (
                <div className="space-y-2">
                  {gstr1.b2b.map((inv, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 text-sm">
                      <div><p className="font-medium text-gray-800">{inv.party}</p><p className="text-xs text-gray-500 font-mono">{inv.gstin}</p></div>
                      <div className="text-right"><p className="font-semibold text-gray-900">₹{Number(inv.total).toLocaleString("en-IN")}</p><p className="text-xs text-gray-500">{inv.invoice_number}</p></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-800 mb-3">B2C Sales (Unregistered Parties)</h2>
              <div className="space-y-2">
                {[["Taxable Value", gstr1.b2c.taxable], ["CGST", gstr1.b2c.cgst], ["SGST", gstr1.b2c.sgst], ["IGST", gstr1.b2c.igst], ["Total", gstr1.b2c.total]].map(([label, val]) => (
                  <div key={label} className="flex justify-between py-2 border-b border-gray-100 text-sm">
                    <span className="text-gray-600">{label}</span>
                    <span className="font-semibold text-gray-900">₹{Number(val || 0).toLocaleString("en-IN")}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
