import { Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Layout } from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import CustomerList from "./pages/CustomerList";
import CustomerForm from "./pages/CustomerForm";
import CustomerDetail from "./pages/CustomerDetail";
import ProductList from "./pages/ProductList";
import ProductForm from "./pages/ProductForm";
import ProductDetail from "./pages/ProductDetail";
import ChallanList from "./pages/ChallanList";
import ChallanForm from "./pages/ChallanForm";
import ChallanDetail from "./pages/ChallanDetail";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route path="/" element={<Shell><Dashboard /></Shell>} />

      <Route path="/customers" element={<Shell><CustomerList /></Shell>} />
      <Route path="/customers/new" element={<Shell><CustomerForm /></Shell>} />
      <Route path="/customers/:id" element={<Shell><CustomerDetail /></Shell>} />
      <Route path="/customers/:id/edit" element={<Shell><CustomerForm /></Shell>} />

      <Route path="/products" element={<Shell><ProductList /></Shell>} />
      <Route path="/products/new" element={<Shell><ProductForm /></Shell>} />
      <Route path="/products/:id" element={<Shell><ProductDetail /></Shell>} />
      <Route path="/products/:id/edit" element={<Shell><ProductForm /></Shell>} />

      <Route path="/challans" element={<Shell><ChallanList /></Shell>} />
      <Route path="/challans/new" element={<Shell><ChallanForm /></Shell>} />
      <Route path="/challans/:id" element={<Shell><ChallanDetail /></Shell>} />

      <Route path="*" element={<Shell><div>Page not found</div></Shell>} />
    </Routes>
  );
}
