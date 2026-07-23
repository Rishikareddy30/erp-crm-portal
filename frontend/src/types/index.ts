export type Role = "ADMIN" | "SALES" | "WAREHOUSE" | "ACCOUNTS";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export type CustomerType = "RETAIL" | "WHOLESALE" | "DISTRIBUTOR";
export type CustomerStatus = "LEAD" | "ACTIVE" | "INACTIVE";

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  email?: string | null;
  businessName?: string | null;
  gstNumber?: string | null;
  customerType: CustomerType;
  address?: string | null;
  status: CustomerStatus;
  followUpDate?: string | null;
  createdAt: string;
  notes?: CustomerNote[];
  challans?: Challan[];
}

export interface CustomerNote {
  id: string;
  note: string;
  createdAt: string;
  createdBy?: { name: string } | null;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category?: string | null;
  unitPrice: string | number;
  currentStock: number;
  minStockAlert: number;
  location?: string | null;
  createdAt: string;
  stockMovements?: StockMovement[];
}

export interface StockMovement {
  id: string;
  quantity: number;
  movementType: "IN" | "OUT";
  reason: string;
  createdAt: string;
}

export type ChallanStatus = "DRAFT" | "CONFIRMED" | "CANCELLED";

export interface ChallanItem {
  id: string;
  productId: string;
  productNameSnapshot: string;
  skuSnapshot: string;
  unitPriceSnapshot: string | number;
  quantity: number;
}

export interface Challan {
  id: string;
  challanNumber: string;
  customerId: string;
  customer?: Customer;
  totalQuantity: number;
  status: ChallanStatus;
  createdAt: string;
  items: ChallanItem[];
}

export interface Paginated<T> {
  data: T[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}
