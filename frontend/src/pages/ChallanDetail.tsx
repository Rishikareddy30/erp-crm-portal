import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { Challan } from "../types";
import { StatusBadge } from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";

export default function ChallanDetail() {
  const { id } = useParams();
  const { hasRole } = useAuth();
  const navigate = useNavigate();
  const [challan, setChallan] = useState<Challan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function load() {
    api.get(`/challans/${id}`).then((res) => setChallan(res.data.data));
  }
  useEffect(load, [id]);

  async function handleConfirm() {
    setError(null);
    setBusy(true);
    try {
      await api.post(`/challans/${id}/confirm`);
      load();
    } catch (err: any) {
      const data = err.response?.data;
      if (data?.details?.shortages) {
        const lines = data.details.shortages
          .map((s: any) => `${s.productName}: requested ${s.requested}, available ${s.available}`)
          .join("; ");
        setError(`Insufficient stock — ${lines}`);
      } else {
        setError(data?.error || "Failed to confirm challan");
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel() {
    if (!confirm("Cancel this challan? If it was confirmed, stock will be restored.")) return;
    setError(null);
    setBusy(true);
    try {
      await api.post(`/challans/${id}/cancel`);
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to cancel challan");
    } finally {
      setBusy(false);
    }
  }

  async function handleDownloadPdf() {
    setError(null);
    try {
      const res = await api.get(`/challans/${id}/pdf`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `${challan!.challanNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setError("Failed to generate PDF");
    }
  }

  if (!challan) return <p className="text-sm text-ink/50">Loading...</p>;

  const canManage = hasRole("ADMIN", "SALES") && challan.status === "DRAFT";

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink font-mono">{challan.challanNumber}</h1>
          <div className="flex items-center gap-2 mt-1">
            <StatusBadge status={challan.status} />
            <Link to={`/customers/${challan.customerId}`} className="text-sm text-brand hover:underline">
              {challan.customer?.name}
            </Link>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={handleDownloadPdf}>
            Download PDF
          </button>
          {hasRole("ADMIN", "SALES") && challan.status !== "CANCELLED" && (
            <>
              {challan.status === "DRAFT" && (
                <button className="btn-primary" onClick={handleConfirm} disabled={busy}>
                  Confirm challan
                </button>
              )}
              <button className="btn-danger" onClick={handleCancel} disabled={busy}>
                Cancel challan
              </button>
            </>
          )}
        </div>
      </div>

      {error && <div className="card p-3 mb-4 text-sm text-warn bg-warn/5 border-warn/30">{error}</div>}

      <section className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-black/[0.03] text-left text-xs uppercase tracking-wide text-ink/50">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Unit price</th>
              <th className="px-4 py-3">Qty</th>
              <th className="px-4 py-3">Line total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {challan.items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3">{item.productNameSnapshot}</td>
                <td className="px-4 py-3 font-mono text-xs">{item.skuSnapshot}</td>
                <td className="px-4 py-3">₹{Number(item.unitPriceSnapshot).toFixed(2)}</td>
                <td className="px-4 py-3">{item.quantity}</td>
                <td className="px-4 py-3">
                  ₹{(Number(item.unitPriceSnapshot) * item.quantity).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-line font-medium">
              <td className="px-4 py-3" colSpan={3}>
                Total
              </td>
              <td className="px-4 py-3">{challan.totalQuantity}</td>
              <td className="px-4 py-3">
                ₹
                {challan.items
                  .reduce((sum, i) => sum + Number(i.unitPriceSnapshot) * i.quantity, 0)
                  .toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
      </section>

      <p className="text-xs text-ink/40 mt-3">
        Product name, SKU, and price are snapshotted at the time this challan was created — later changes to
        the product catalog won't retroactively affect this document.
      </p>
    </div>
  );
}
