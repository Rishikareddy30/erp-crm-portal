import { useEffect, useState, FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import { Customer } from "../types";
import { StatusBadge } from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";

export default function CustomerDetail() {
  const { id } = useParams();
  const { hasRole } = useAuth();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [note, setNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  function load() {
    api.get(`/customers/${id}`).then((res) => setCustomer(res.data.data));
  }

  useEffect(load, [id]);

  async function handleAddNote(e: FormEvent) {
    e.preventDefault();
    if (!note.trim()) return;
    setAddingNote(true);
    try {
      await api.post(`/customers/${id}/notes`, { note });
      setNote("");
      load();
    } finally {
      setAddingNote(false);
    }
  }

  if (!customer) return <p className="text-sm text-ink/50">Loading...</p>;

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">{customer.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <StatusBadge status={customer.status} />
            <span className="text-sm text-ink/50">{customer.customerType}</span>
          </div>
        </div>
        {hasRole("ADMIN", "SALES") && (
          <Link to={`/customers/${id}/edit`} className="btn-secondary">
            Edit
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <section className="card p-5 md:col-span-1 space-y-3 text-sm">
          <h2 className="font-display font-semibold text-base mb-2">Details</h2>
          <div>
            <div className="label">Mobile</div>
            <div className="font-mono">{customer.mobile}</div>
          </div>
          {customer.email && (
            <div>
              <div className="label">Email</div>
              <div>{customer.email}</div>
            </div>
          )}
          {customer.businessName && (
            <div>
              <div className="label">Business</div>
              <div>{customer.businessName}</div>
            </div>
          )}
          {customer.gstNumber && (
            <div>
              <div className="label">GST</div>
              <div className="font-mono">{customer.gstNumber}</div>
            </div>
          )}
          {customer.address && (
            <div>
              <div className="label">Address</div>
              <div>{customer.address}</div>
            </div>
          )}
          {customer.followUpDate && (
            <div>
              <div className="label">Follow-up date</div>
              <div>{new Date(customer.followUpDate).toLocaleDateString()}</div>
            </div>
          )}
        </section>

        <section className="card p-5 md:col-span-2">
          <h2 className="font-display font-semibold text-base mb-3">Follow-up notes</h2>
          {hasRole("ADMIN", "SALES") && (
            <form onSubmit={handleAddNote} className="flex gap-2 mb-4">
              <input
                className="input"
                placeholder="Add a follow-up note..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <button className="btn-primary shrink-0" disabled={addingNote}>
                Add
              </button>
            </form>
          )}
          {(customer.notes?.length ?? 0) === 0 ? (
            <p className="text-sm text-ink/40">No notes yet.</p>
          ) : (
            <ul className="space-y-3">
              {customer.notes!.map((n) => (
                <li key={n.id} className="border-b border-line pb-3 last:border-0">
                  <p className="text-sm">{n.note}</p>
                  <p className="text-xs text-ink/40 mt-1">
                    {n.createdBy?.name || "Unknown"} &middot; {new Date(n.createdAt).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}

          <h2 className="font-display font-semibold text-base mt-6 mb-3">Challan history</h2>
          {(customer.challans?.length ?? 0) === 0 ? (
            <p className="text-sm text-ink/40">No challans for this customer yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {customer.challans!.map((c) => (
                <li key={c.id} className="py-2 flex items-center justify-between text-sm">
                  <Link to={`/challans/${c.id}`} className="font-mono text-brand hover:underline">
                    {c.challanNumber}
                  </Link>
                  <StatusBadge status={c.status} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
