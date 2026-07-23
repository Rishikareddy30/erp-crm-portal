import { Navigate, useLocation } from "react-router-dom";
import { ReactNode } from "react";
import { useAuth } from "../context/AuthContext";
import { Role } from "../types";

export function ProtectedRoute({
  children,
  roles,
}: {
  children: ReactNode;
  roles?: Role[];
}) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (roles && !roles.includes(user.role)) {
    return (
      <div className="p-8">
        <h1 className="font-display text-xl text-ink mb-2">Access restricted</h1>
        <p className="text-sm text-ink/60">
          Your role ({user.role}) doesn't have access to this section.
        </p>
      </div>
    );
  }
  return <>{children}</>;
}
