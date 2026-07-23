import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { Product } from "../types";
import { useAuth } from "../context/AuthContext";

export default function ProductList() {
  const { hasRole } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const timeout = setTimeout(() => {
      api
        .get("/products", { params: { search: search || undefined, lowStock: lowStockOnly ? "true" : undefined } })
        .then((res) => setProducts(res.data.data))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timeout);
  }, [search, lowStockOnly]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Products & Stock</h1>
          <p className="text-sm text-ink/50">Catalog and current inventory levels.</p>
        </div>
        {hasRole("ADMIN", "WAREHOUSE") && (
          <Link to="/products/new" className="btn-primary">
            Add product
          </Link>
        )}
      </div>

      <div className="flex items-center gap-4 mb-4">
        <input
          className="input max-w-xs"
          placeholder="Search name or SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm text-ink/70">
          <input type="checkbox" checked={lowStockOnly} onChange={(e) => setLowStockOnly(e.target.checked)} />
          Low stock only
        </label>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-black/[0.03] text-left text-xs uppercase tracking-wide text-ink/50">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Location</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-ink/40">
                  Loading...
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-ink/40">
                  No products found.
                </td>
              </tr>
            ) : (
              products.map((p) => {
                const low = p.currentStock <= p.minStockAlert;
                return (
                  <tr key={p.id} className="hover:bg-black/[0.02]">
                    <td className="px-4 py-3">
                      <Link to={`/products/${p.id}`} className="font-medium text-brand hover:underline">
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{p.sku}</td>
                    <td className="px-4 py-3">{p.category || "—"}</td>
                    <td className="px-4 py-3">₹{Number(p.unitPrice).toFixed(2)}</td>
                    <td className={`px-4 py-3 font-medium ${low ? "text-warn" : ""}`}>
                      {p.currentStock}
                      {low && <span className="ml-1 text-xs">(low)</span>}
                    </td>
                    <td className="px-4 py-3 text-ink/50">{p.location || "—"}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
