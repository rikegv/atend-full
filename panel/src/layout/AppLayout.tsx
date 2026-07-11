import { Outlet, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth";
import {
  LayoutDashboard,
  LogOut,
  ChevronRight,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
];

export function AppLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const roleLabel =
    user?.role === "SUPER_ADMIN" ? "Super Admin" : "Admin Tenant";

  return (
    <div className="flex h-screen bg-[var(--color-background)]">
      {/* Sidebar */}
      <aside className="w-[240px] flex-shrink-0 border-r border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col">
        {/* Brand */}
        <div className="h-16 flex items-center px-5 border-b border-[var(--color-border-subtle)]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-[var(--color-accent)] flex items-center justify-center">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="text-[14px] font-semibold tracking-[-0.01em] text-[var(--color-text-primary)]">
              Painel Admin
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <NavLink
                key={item.href}
                to={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 group ${
                  isActive
                    ? "bg-[var(--color-accent-subtle)] text-[var(--color-text-primary)]"
                    : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                <item.icon
                  size={16}
                  strokeWidth={isActive ? 2 : 1.5}
                  className={isActive ? "text-[var(--color-accent)]" : ""}
                />
                {item.name}
                {isActive && (
                  <ChevronRight size={14} className="ml-auto text-[var(--color-text-muted)]" />
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="border-t border-[var(--color-border-subtle)] p-3">
          <div className="flex items-center gap-2.5 px-2 py-1.5">
            <div className="w-8 h-8 rounded-full bg-[var(--color-accent-subtle)] flex items-center justify-center flex-shrink-0">
              <span className="text-[12px] font-semibold text-[var(--color-accent)]">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-[var(--color-text-primary)] truncate">
                {user?.name}
              </p>
              <p className="text-[11px] text-[var(--color-text-muted)]">
                {roleLabel}
              </p>
            </div>
            <button
              onClick={logout}
              title="Sair"
              className="p-1.5 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="h-16 border-b border-[var(--color-border)] flex items-center px-8 bg-[var(--color-surface)]">
          <div className="flex items-center gap-2 text-[13px] text-[var(--color-text-muted)]">
            <span>Painel</span>
            <ChevronRight size={12} />
            <span className="text-[var(--color-text-primary)] font-medium">
              {navigation.find((n) => n.href === location.pathname)?.name ?? "Página"}
            </span>
          </div>
        </header>

        {/* Page content */}
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
