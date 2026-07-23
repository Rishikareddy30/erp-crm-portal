import { useEffect, useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { Customer, Product } from "../types";

interface LineItem {
  productId: string;
  quantity: string;
}

export default function ChallanForm() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [items, setItems] = useState<LineItem[]>([{ productId: "", quantity: "1" }]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<"Draft" | "Confirmed" | null>(null);

  useEffect(() => {
    api.get("/customers", { params: { pageSize: 100 } }).then((res) => setCustomers(res.data.data));
    api.get("/products", { params: { pageSize: 100 } }).then((res) => setProducts(res.data.data));
  }, []);

  function updateItem(index: number, patch: Partial<LineItem>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }
  function addItem() {
    setItems((prev) => [...prev, { productId: "", quantity: "1" }]);
  }
  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function productById(id: string) {
    return products.find((p) => p.id === id);
  }

  async function handleSubmit(e: FormEvent, status: "Draft" | "Confirmed") {
    e.preventDefault();
    setError(null);

    if (!customerId) {
      setError("Please select a customer");
      return;
    }
    const validItems = items.filter((i) => i.productId && Number(i.quantity) > 0);
    if (validItems.length === 0) {
      setError("Add at least one product with a quantity");
      return;
    }

    setSaving(status);
    try {
      const res = await api.post("/challans", {
        customerId,
        status,
        items: validItems.map((i) => ({ productId: i.productId, quantity: Number(i.quantity) })),
      });
      navigate(`/challans/${res.data.data.id}`);
    } catch (err: any) {
      const data = err.response?.data;
      if (data?.details?.shortages) {
        const lines = data.details.shortages
          .map((s: any) => `${s.productName}: requested ${s.requested}, available ${s.available}`)
          .join("; ");
        setError(`Insufficient stock — ${lines}`);
      } else {
        setError(data?.error || "Failed to save challan");
      }
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-2xl font-semibold text-ink mb-6">New sales challan</h1>

      <form className="card p-6 space-y-5">
        <div>
          <label className="label">Customer *</label>
          <select className="input" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">Select a customer...</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.businessName ? `(${c.businessName})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="label mb-0">Products</label>
            <button type="button" className="text-xs text-brand hover:underline" onClick={addItem}>
              + Add product line
            </button>
          </div>

          <div className="space-y-2">
            {items.map((item, idx) => {
              const p = productById(item.productId);
              return (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <select
                    className="input col-span-6"
                    value={item.productId}
                    onChange={(e) => updateItem(idx, { productId: e.target.value })}
                  >
                    <option value="">Select product...</option>
                    {products.map((prod) => (
                      <option key={prod.id} value={prod.id}>
                        {prod.name} ({prod.sku}) — stock: {prod.currentStock}
                      </option>
                    ))}
                  </select>
                  <input
                    className="input col-span-3"
                    type="number"
                    min="1"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => updateItem(idx, { quantity: e.target.value })}
                  />
                  <div className="col-span-2 text-xs text-ink/50">
                    {p ? `₹${(Number(p.unitPrice) * Number(item.quantity || 0)).toFixed(2)}` : ""}
                  </div>
                  <button
                    type="button"
                    className="col-span-1 text-warn text-xs hover:underline"
                    onClick={() => removeItem(idx)}
                    disabled={items.length === 1}
                  >
                    Remove
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {error && <p className="text-sm text-warn whitespace-pre-wrap">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            className="btn-secondary"
            disabled={saving !== null}
            onClick={(e) => handleSubmit(e as any, "Draft")}
          >
            {saving === "Draft" ? "Saving..." : "Save as Draft"}
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={saving !== null}
            onClick={(e) => handleSubmit(e as any, "Confirmed")}
          >
            {saving === "Confirmed" ? "Confirming..." : "Save & Confirm"}
          </button>
          <button type="button" className="text-sm text-ink/50 hover:underline ml-auto" onClick={() => navigate(-1)}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
