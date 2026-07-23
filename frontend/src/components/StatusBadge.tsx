const styles: Record<string, string> = {
  LEAD: "bg-amber-100 text-amber-800",
  ACTIVE: "bg-green-100 text-green-800",
  INACTIVE: "bg-gray-200 text-gray-600",
  DRAFT: "bg-amber-100 text-amber-800",
  CONFIRMED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-700",
  IN: "bg-green-100 text-green-800",
  OUT: "bg-red-100 text-red-700",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`badge ${styles[status] || "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
}
