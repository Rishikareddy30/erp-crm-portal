import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { Challan } from "../types";
import { StatusBadge } from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";

export default function ChallanList() {
  const { hasRole } = useAuth();
  const [challans, setChallans] = useState<Challan[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get("/challans", { params: { status: status || undefined } })
      .then((res) => setChallans(res.data.data))
      .finally(() => setLoading(false));
  }, [status]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Sales Challans</h1>
          <p className="text-sm text-ink/50">Draft, confirm, and track dispatch documents.</p>
        </div>
        {hasRole("ADMIN", "SALES") && (
          <Link to="/challans/new" className="btn-primary">
            New challan
          </Link>
        )}
      </div>

      <div className="mb-4">
        <select className="input max-w-[180px]" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="Draft">Draft</option>
          <option value="Confirmed">Confirmed</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-black/[0.03] text-left text-xs uppercase tracking-wide text-ink/50">
            <tr>
              <th className="px-4 py-3">Challan #</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Total qty</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-ink/40">
                  Loading...
                </td>
              </tr>
            ) : challans.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-ink/40">
                  No challans found.
                </td>
              </tr>
            ) : (
              challans.map((c) => (
                <tr key={c.id} className="hover:bg-black/[0.02]">
                  <td className="px-4 py-3">
                    <Link to={`/challans/${c.id}`} className="font-mono font-medium text-brand hover:underline">
                      {c.challanNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{c.customer?.name}</td>
                  <td className="px-4 py-3">{c.totalQuantity}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-ink/50">
                    {new Date(c.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
