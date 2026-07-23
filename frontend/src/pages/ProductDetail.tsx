import { useEffect, useState, FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import { Product } from "../types";
import { StatusBadge } from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";

export default function ProductDetail() {
  const { id } = useParams();
  const { hasRole } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState("");
  const [movementType, setMovementType] = useState<"IN" | "OUT">("IN");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function load() {
    api.get(`/products/${id}`).then((res) => setProduct(res.data.data));
  }
  useEffect(load, [id]);

  async function handleMovement(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.post(`/products/${id}/stock-movements`, {
        quantity: Number(quantity),
        movementType,
        reason,
      });
      setQuantity("");
      setReason("");
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to record stock movement");
    } finally {
      setSaving(false);
    }
  }

  if (!product) return <p className="text-sm text-ink/50">Loading...</p>;

  const low = product.currentStock <= product.minStockAlert;

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">{product.name}</h1>
          <div className="text-sm text-ink/50 font-mono mt-1">{product.sku}</div>
        </div>
        {hasRole("ADMIN", "WAREHOUSE") && (
          <Link to={`/products/${id}/edit`} className="btn-secondary">
            Edit
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <section className="card p-5 space-y-3 text-sm">
          <h2 className="font-display font-semibold text-base mb-2">Details</h2>
          <div>
            <div className="label">Current stock</div>
            <div className={`text-lg font-semibold ${low ? "text-warn" : "text-ink"}`}>
              {product.currentStock}
              {low && <span className="ml-2 text-xs font-normal">below minimum ({product.minStockAlert})</span>}
            </div>
          </div>
          <div>
            <div className="label">Unit price</div>
            <div>₹{Number(product.unitPrice).toFixed(2)}</div>
          </div>
          {product.category && (
            <div>
              <div className="label">Category</div>
              <div>{product.category}</div>
            </div>
          )}
          {product.location && (
            <div>
              <div className="label">Location</div>
              <div>{product.location}</div>
            </div>
          )}
        </section>

        <section className="card p-5 md:col-span-2">
          <h2 className="font-display font-semibold text-base mb-3">Stock movements</h2>

          {hasRole("ADMIN", "WAREHOUSE") && (
            <form onSubmit={handleMovement} className="grid grid-cols-4 gap-2 mb-4">
              <select
                className="input"
                value={movementType}
                onChange={(e) => setMovementType(e.target.value as "IN" | "OUT")}
              >
                <option value="IN">Stock IN</option>
                <option value="OUT">Stock OUT</option>
              </select>
              <input
                className="input"
                type="number"
                min="1"
                placeholder="Qty"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
              <input
                className="input col-span-2"
                placeholder="Reason (e.g. purchase received, damage, correction)"
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <button className="btn-primary col-span-4" disabled={saving}>
                {saving ? "Saving..." : "Record movement"}
              </button>
            </form>
          )}
          {error && <p className="text-sm text-warn mb-3">{error}</p>}

          {(product.stockMovements?.length ?? 0) === 0 ? (
            <p className="text-sm text-ink/40">No movements recorded yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-ink/50 border-b border-line">
                <tr>
                  <th className="py-2">Type</th>
                  <th className="py-2">Qty</th>
                  <th className="py-2">Reason</th>
                  <th className="py-2">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {product.stockMovements!.map((m) => (
                  <tr key={m.id}>
                    <td className="py-2">
                      <StatusBadge status={m.movementType} />
                    </td>
                    <td className="py-2">{m.quantity}</td>
                    <td className="py-2 text-ink/70">{m.reason}</td>
                    <td className="py-2 text-xs text-ink/40">{new Date(m.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}
