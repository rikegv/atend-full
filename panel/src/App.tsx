import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./lib/auth-context";
import AppLayout from "./layout/AppLayout";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import KnowledgeBasePage from "./pages/KnowledgeBasePage";
import AcademiasPage from "./pages/AcademiasPage";
import EquipePage from "./pages/EquipePage";
import AtendentePlaceholder from "./pages/AtendentePlaceholder";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[var(--color-text-muted)] border-t-[var(--color-text-primary)] rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function GuestRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function SuperAdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (user?.role !== "SUPER_ADMIN") return <Navigate to="/" replace />;
  return <>{children}</>;
}

function TenantAdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (user?.role !== "TENANT_ADMIN") return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (user?.role === "ATENDENTE") return <Navigate to="/" replace />;
  return <>{children}</>;
}

function IndexPage() {
  const { user } = useAuth();
  if (user?.role === "ATENDENTE") return <AtendentePlaceholder />;
  return <DashboardPage />;
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={<GuestRoute><LoginPage /></GuestRoute>}
      />
      <Route
        element={<ProtectedRoute><AppLayout /></ProtectedRoute>}
      >
        <Route index element={<IndexPage />} />
        <Route path="base" element={<AdminRoute><KnowledgeBasePage /></AdminRoute>} />
        <Route path="academias" element={<SuperAdminRoute><AcademiasPage /></SuperAdminRoute>} />
        <Route path="equipe" element={<TenantAdminRoute><EquipePage /></TenantAdminRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
