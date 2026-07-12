import { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../lib/auth-context";
import { useTenantContext, type TenantOption } from "../lib/tenant-context";
import { listTenants } from "../lib/admin-api";
import {
  LayoutDashboard,
  BookOpen,
  Building2,
  Users,
  LogOut,
  ChevronDown,
} from "lucide-react";

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const isTenantAdmin = user?.role === "TENANT_ADMIN";
  const isAtendente = user?.role === "ATENDENTE";
  const { selectedTenant, selectTenant } = useTenantContext();

  const [tenantOptions, setTenantOptions] = useState<TenantOption[]>([]);
  const [selectorOpen, setSelectorOpen] = useState(false);

  useEffect(() => {
    if (isSuperAdmin) {
      listTenants().then((list) => {
        const active = list.filter((t) => t.active);
        setTenantOptions(active);
      });
    }
  }, [isSuperAdmin]);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  const navItems = isAtendente
    ? [{ to: "/", label: "Início", icon: LayoutDashboard }]
    : [
        { to: "/", label: "Dashboard", icon: LayoutDashboard },
        ...(isSuperAdmin
          ? [{ to: "/academias", label: "Academias", icon: Building2 }]
          : []),
        ...(isTenantAdmin
          ? [{ to: "/equipe", label: "Equipe", icon: Users }]
          : []),
        { to: "/base", label: "Base de Conhecimento", icon: BookOpen },
      ];

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 bg-[var(--color-sidebar-bg)] flex flex-col">
        {/* Header */}
        <div className="px-5 py-6 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/10">
              <span className="text-white font-semibold text-sm">A</span>
            </div>
            <span className="text-sm font-semibold text-[var(--color-sidebar-text)] tracking-tight">
              Painel
            </span>
          </div>
        </div>

        {/* Tenant selector (SUPER_ADMIN only) */}
        {isSuperAdmin && (
          <div className="px-3 pt-4 pb-2">
            <p className="px-3 mb-1.5 text-[10px] font-medium text-[var(--color-sidebar-text-muted)] uppercase tracking-widest">
              Contexto
            </p>
            <div className="relative">
              <button
                type="button"
                onClick={() => setSelectorOpen(!selectorOpen)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-[var(--color-sidebar-text)] bg-white/[0.06] hover:bg-white/[0.10] transition-colors cursor-pointer"
              >
                <span className="truncate text-left">
                  {selectedTenant ? selectedTenant.name : "Selecionar academia"}
                </span>
                <ChevronDown
                  size={14}
                  className={`shrink-0 opacity-50 transition-transform ${selectorOpen ? "rotate-180" : ""}`}
                />
              </button>
              {selectorOpen && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-[var(--color-sidebar-bg)] border border-white/10 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                  {tenantOptions.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        selectTenant(t);
                        setSelectorOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-white/[0.06] cursor-pointer ${
                        selectedTenant?.id === t.id
                          ? "text-[var(--color-sidebar-text)] bg-white/[0.04]"
                          : "text-[var(--color-sidebar-text-muted)]"
                      }`}
                    >
                      {t.name}
                    </button>
                  ))}
                  {tenantOptions.length === 0 && (
                    <p className="px-3 py-2 text-xs text-[var(--color-sidebar-text-muted)]">
                      Nenhuma academia ativa
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
                  active
                    ? "text-[var(--color-sidebar-text)] bg-white/[0.06]"
                    : "text-[var(--color-sidebar-text-muted)] hover:text-[var(--color-sidebar-text)] hover:bg-white/[0.04]"
                }`}
              >
                <Icon size={18} className="opacity-70" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Footer / user */}
        <div className="px-3 py-4 border-t border-white/[0.06]">
          <div className="flex items-center justify-between px-3 py-2">
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--color-sidebar-text)] truncate">
                {user?.name}
              </p>
              <p className="text-xs text-[var(--color-sidebar-text-muted)] truncate">
                {user?.role === "SUPER_ADMIN" ? "Super Admin" : user?.tenantName}
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-[var(--color-sidebar-text-muted)] hover:text-[var(--color-sidebar-text)] hover:bg-white/[0.06] transition-colors duration-200 cursor-pointer"
              title="Sair"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-y-auto bg-[var(--color-background)]">
        <Outlet />
      </main>
    </div>
  );
}
