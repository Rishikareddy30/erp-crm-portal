import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { Customer } from "../types";
import { StatusBadge } from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";

export default function CustomerList() {
  const { hasRole } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setLoading(true);
    const timeout = setTimeout(() => {
      api
        .get("/customers", { params: { search: search || undefined, status: status || undefined, page } })
        .then((res) => {
          setCustomers(res.data.data);
          setTotalPages(res.data.pagination.totalPages);
        })
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timeout);
  }, [search, status, page]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Customers</h1>
          <p className="text-sm text-ink/50">Leads, active accounts, and follow-ups.</p>
        </div>
        {hasRole("ADMIN", "SALES") && (
          <Link to="/customers/new" className="btn-primary">
            Add customer
          </Link>
        )}
      </div>

      <div className="flex gap-3 mb-4">
        <input
          className="input max-w-xs"
          placeholder="Search name, mobile, business..."
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
        />
        <select
          className="input max-w-[160px]"
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
        >
          <option value="">All statuses</option>
          <option value="LEAD">Lead</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-black/[0.03] text-left text-xs uppercase tracking-wide text-ink/50">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Mobile</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Follow-up</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-ink/40">
                  Loading...
                </td>
              </tr>
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-ink/40">
                  No customers found.
                </td>
              </tr>
            ) : (
              customers.map((c) => (
                <tr key={c.id} className="hover:bg-black/[0.02]">
                  <td className="px-4 py-3">
                    <Link to={`/customers/${c.id}`} className="font-medium text-brand hover:underline">
                      {c.name}
                    </Link>
                    {c.businessName && <div className="text-xs text-ink/40">{c.businessName}</div>}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{c.mobile}</td>
                  <td className="px-4 py-3">{c.customerType}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-ink/50">
                    {c.followUpDate ? new Date(c.followUpDate).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button
            className="btn-secondary"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </button>
          <span className="px-3 py-2 text-sm text-ink/50">
            Page {page} of {totalPages}
          </span>
          <button
            className="btn-secondary"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
