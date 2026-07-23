import { NavLink, useNavigate } from "react-router-dom";
import { ReactNode } from "react";
import { useAuth } from "../context/AuthContext";

const navItems = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/customers", label: "Customers" },
  { to: "/products", label: "Products & Stock" },
  { to: "/challans", label: "Sales Challans" },
];

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex">
      <aside className="w-60 shrink-0 border-r border-line bg-panel flex flex-col">
        <div className="px-5 py-5 border-b border-line">
          <div className="font-display text-lg font-semibold text-brand leading-tight">
            Ledger
          </div>
          <div className="text-[11px] uppercase tracking-widest text-ink/40 mt-0.5">
            Ops Portal
          </div>
        </div>
        <nav className="flex-1 py-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `block px-5 py-2.5 text-sm border-l-2 transition-colors ${
                  isActive
                    ? "border-brand bg-brand/5 text-brand font-medium"
                    : "border-transparent text-ink/70 hover:bg-black/5 hover:text-ink"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-5 py-4 border-t border-line">
          <div className="text-sm font-medium text-ink">{user?.name}</div>
          <div className="text-xs text-ink/50 uppercase tracking-wide">{user?.role}</div>
          <button
            onClick={() => {
              logout();
              navigate("/login");
            }}
            className="mt-3 text-xs text-warn hover:underline"
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        <div className="max-w-6xl mx-auto px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
