import { useEffect, useState } from "react";
import { listParties, getLedger } from "../../api/accApi";

const inp = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400";
function fmt(n) { return "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 }); }

export default function Ledger() {
  const [parties, setParties] = useState([]);
  const [selectedParty, setSelectedParty] = useState("");
  const [ledgerData, setLedgerData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    listParties({ limit: 500 }).then(d => setParties(d.items || d));
  }, []);

  useEffect(() => {
    if (!selectedParty) { setLedgerData(null); return; }
    setLoading(true);
    setError("");
    getLedger(selectedParty)
      .then(setLedgerData)
      .catch(() => setError("Failed to load ledger"))
      .finally(() => setLoading(false));
  }, [selectedParty]);

  const party = ledgerData?.party;
  const entries = ledgerData?.entries || [];
  const closing = ledgerData?.closing_balance ?? null;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <h1 className="text-2xl font-bold text-gray-800">Party Ledger</h1>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <label className="block text-xs font-medium text-gray-600 mb-2">Select Party</label>
        <select className={inp + " max-w-sm"} value={selectedParty} onChange={e => setSelectedParty(e.target.value)}>
          <option value="">Choose a party…</option>
          {parties.map(p => <option key={p.id} value={p.id}>{p.name} ({p.party_type})</option>)}
        </select>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-32">
          <div className="w-7 h-7 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && <div className="text-red-600 bg-red-50 px-4 py-3 rounded-lg text-sm">{error}</div>}

      {ledgerData && !loading && (
        <>
          {/* Party info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div><p className="text-xs text-gray-500">Name</p><p className="font-semibold text-gray-800">{party?.name}</p></div>
              <div><p className="text-xs text-gray-500">Type</p><p className="font-medium">{party?.party_type}</p></div>
              <div><p className="text-xs text-gray-500">GSTIN</p><p className="font-mono text-xs">{party?.gstin || "—"}</p></div>
              <div>
                <p className="text-xs text-gray-500">Closing Balance</p>
                <p className={`text-lg font-bold ${closing < 0 ? "text-red-600" : "text-green-700"}`}>{fmt(closing)}</p>
              </div>
            </div>
          </div>

          {/* Ledger table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-purple-50 text-xs uppercase text-purple-700">
                <tr>
                  {["Date", "Description", "Debit (Dr)", "Credit (Cr)", "Balance"].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {entries.map((entry, i) => (
                  <tr key={i} className={i === 0 ? "bg-gray-50 font-medium" : "hover:bg-gray-50"}>
                    <td className="px-4 py-3 text-gray-600">{entry.date ? new Date(entry.date).toLocaleDateString("en-IN") : "Opening"}</td>
                    <td className="px-4 py-3 text-gray-800">{entry.description}</td>
                    <td className="px-4 py-3 text-red-600">{entry.debit > 0 ? fmt(entry.debit) : "—"}</td>
                    <td className="px-4 py-3 text-green-700">{entry.credit > 0 ? fmt(entry.credit) : "—"}</td>
                    <td className={`px-4 py-3 font-semibold ${entry.balance < 0 ? "text-red-600" : "text-gray-800"}`}>{fmt(entry.balance)}</td>
                  </tr>
                ))}
                {entries.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No transactions found</td></tr>
                )}
              </tbody>
              {entries.length > 0 && (
                <tfoot className="bg-purple-50">
                  <tr>
                    <td colSpan={4} className="px-4 py-3 font-semibold text-gray-700 text-right">Closing Balance</td>
                    <td className={`px-4 py-3 font-bold text-base ${closing < 0 ? "text-red-600" : "text-green-700"}`}>{fmt(closing)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </>
      )}

      {!selectedParty && !loading && (
        <div className="bg-white rounded-xl border border-dashed border-gray-200 p-12 text-center">
          <p className="text-gray-400 text-sm">Select a party above to view their ledger</p>
        </div>
      )}
    </div>
  );
}
