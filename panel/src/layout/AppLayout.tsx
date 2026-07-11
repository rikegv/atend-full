import { Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../lib/auth-context";
import { LayoutDashboard, BookOpen, LogOut } from "lucide-react";

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const location = useLocation();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  const navItems = [
    { to: "/", label: "Dashboard", icon: LayoutDashboard },
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
