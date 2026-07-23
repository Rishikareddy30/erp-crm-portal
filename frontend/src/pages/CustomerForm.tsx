import { useEffect, useState, FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";

const emptyForm = {
  name: "",
  mobile: "",
  email: "",
  businessName: "",
  gstNumber: "",
  customerType: "RETAIL",
  address: "",
  status: "LEAD",
  followUpDate: "",
};

export default function CustomerForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit) {
      api.get(`/customers/${id}`).then((res) => {
        const c = res.data.data;
        setForm({
          name: c.name || "",
          mobile: c.mobile || "",
          email: c.email || "",
          businessName: c.businessName || "",
          gstNumber: c.gstNumber || "",
          customerType: c.customerType,
          address: c.address || "",
          status: c.status,
          followUpDate: c.followUpDate ? c.followUpDate.slice(0, 10) : "",
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
        ...form,
        email: form.email || null,
        businessName: form.businessName || null,
        gstNumber: form.gstNumber || null,
        address: form.address || null,
        followUpDate: form.followUpDate || null,
      };
      if (isEdit) {
        await api.put(`/customers/${id}`, payload);
        navigate(`/customers/${id}`);
      } else {
        const res = await api.post("/customers", payload);
        navigate(`/customers/${res.data.data.id}`);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to save customer");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-2xl font-semibold text-ink mb-6">
        {isEdit ? "Edit customer" : "Add customer"}
      </h1>

      <form onSubmit={handleSubmit} className="card p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Customer name *</label>
            <input className="input" required value={form.name} onChange={(e) => update("name", e.target.value)} />
          </div>
          <div>
            <label className="label">Mobile number *</label>
            <input className="input" required value={form.mobile} onChange={(e) => update("mobile", e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} />
          </div>
          <div>
            <label className="label">Business name</label>
            <input className="input" value={form.businessName} onChange={(e) => update("businessName", e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">GST number (optional)</label>
            <input className="input" value={form.gstNumber} onChange={(e) => update("gstNumber", e.target.value)} />
          </div>
          <div>
            <label className="label">Customer type</label>
            <select className="input" value={form.customerType} onChange={(e) => update("customerType", e.target.value)}>
              <option value="RETAIL">Retail</option>
              <option value="WHOLESALE">Wholesale</option>
              <option value="DISTRIBUTOR">Distributor</option>
            </select>
          </div>
        </div>

        <div>
          <label className="label">Address</label>
          <textarea className="input" rows={2} value={form.address} onChange={(e) => update("address", e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Status</label>
            <select className="input" value={form.status} onChange={(e) => update("status", e.target.value)}>
              <option value="LEAD">Lead</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
          <div>
            <label className="label">Follow-up date</label>
            <input
              className="input"
              type="date"
              value={form.followUpDate}
              onChange={(e) => update("followUpDate", e.target.value)}
            />
          </div>
        </div>

        {error && <p className="text-sm text-warn">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Saving..." : isEdit ? "Save changes" : "Add customer"}
          </button>
          <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
