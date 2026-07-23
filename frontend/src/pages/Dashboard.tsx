import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { Product, Challan } from "../types";
import { StatusBadge } from "../components/StatusBadge";

export default function Dashboard() {
  const [lowStock, setLowStock] = useState<Product[]>([]);
  const [recentChallans, setRecentChallans] = useState<Challan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/products", { params: { lowStock: "true" } }),
      api.get("/challans", { params: { pageSize: 5 } }),
    ])
      .then(([productsRes, challansRes]) => {
        setLowStock(productsRes.data.data);
        setRecentChallans(challansRes.data.data);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink mb-1">Dashboard</h1>
      <p className="text-sm text-ink/50 mb-8">Today's overview across stock and sales.</p>

      {loading ? (
        <p className="text-sm text-ink/50">Loading...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-base font-semibold">Low stock alerts</h2>
              <Link to="/products" className="text-xs text-brand hover:underline">
                View all products
              </Link>
            </div>
            {lowStock.length === 0 ? (
              <p className="text-sm text-ink/50">Nothing below its minimum stock level.</p>
            ) : (
              <ul className="divide-y divide-line">
                {lowStock.map((p) => (
                  <li key={p.id} className="py-2.5 flex items-center justify-between text-sm">
                    <div>
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-ink/50 font-mono">{p.sku}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-warn font-medium">{p.currentStock} left</div>
                      <div className="text-xs text-ink/40">min {p.minStockAlert}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-base font-semibold">Recent challans</h2>
              <Link to="/challans" className="text-xs text-brand hover:underline">
                View all challans
              </Link>
            </div>
            {recentChallans.length === 0 ? (
              <p className="text-sm text-ink/50">No challans yet.</p>
            ) : (
              <ul className="divide-y divide-line">
                {recentChallans.map((c) => (
                  <li key={c.id} className="py-2.5 flex items-center justify-between text-sm">
                    <div>
                      <div className="font-mono font-medium">{c.challanNumber}</div>
                      <div className="text-xs text-ink/50">{c.customer?.name}</div>
                    </div>
                    <StatusBadge status={c.status} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
