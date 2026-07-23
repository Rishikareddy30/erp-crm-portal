import { useEffect, useState, FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";

const emptyForm = {
  name: "",
  sku: "",
  category: "",
  unitPrice: "",
  currentStock: "0",
  minStockAlert: "0",
  location: "",
};

export default function ProductForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit) {
      api.get(`/products/${id}`).then((res) => {
        const p = res.data.data;
        setForm({
          name: p.name,
          sku: p.sku,
          category: p.category || "",
          unitPrice: String(p.unitPrice),
          currentStock: String(p.currentStock),
          minStockAlert: String(p.minStockAlert),
          location: p.location || "",
        });
      });
    }
  }, [id, isEdit]);

  function update<K extends keyof typeof emptyForm>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        sku: form.sku,
        category: form.category || null,
        unitPrice: Number(form.unitPrice),
        minStockAlert: Number(form.minStockAlert),
        location: form.location || null,
        ...(isEdit ? {} : { currentStock: Number(form.currentStock) }),
      };
      if (isEdit) {
        await api.put(`/products/${id}`, payload);
        navigate(`/products/${id}`);
      } else {
        const res = await api.post("/products", payload);
        navigate(`/products/${res.data.data.id}`);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to save product");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="font-display text-2xl font-semibold text-ink mb-6">
        {isEdit ? "Edit product" : "Add product"}
      </h1>

      <form onSubmit={handleSubmit} className="card p-6 space-y-4">
        <div>
          <label className="label">Product name *</label>
          <input className="input" required value={form.name} onChange={(e) => update("name", e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">SKU / code *</label>
            <input
              className="input font-mono"
              required
              disabled={isEdit}
              value={form.sku}
              onChange={(e) => update("sku", e.target.value)}
            />
          </div>
          <div>
            <label className="label">Category</label>
            <input className="input" value={form.category} onChange={(e) => update("category", e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Unit price *</label>
            <input
              className="input"
              type="number"
              step="0.01"
              min="0"
              required
              value={form.unitPrice}
              onChange={(e) => update("unitPrice", e.target.value)}
            />
          </div>
          <div>
            <label className="label">Min stock alert</label>
            <input
              className="input"
              type="number"
              min="0"
              value={form.minStockAlert}
              onChange={(e) => update("minStockAlert", e.target.value)}
            />
          </div>
        </div>
        {!isEdit && (
          <div>
            <label className="label">Initial stock</label>
            <input
              className="input"
              type="number"
              min="0"
              value={form.currentStock}
              onChange={(e) => update("currentStock", e.target.value)}
            />
          </div>
        )}
        {isEdit && (
          <p className="text-xs text-ink/40">
            Stock quantity is changed via stock movements on the product detail page, so every change is logged.
          </p>
        )}
        <div>
          <label className="label">Location / warehouse</label>
          <input className="input" value={form.location} onChange={(e) => update("location", e.target.value)} />
        </div>

        {error && <p className="text-sm text-warn">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Saving..." : isEdit ? "Save changes" : "Add product"}
          </button>
          <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
