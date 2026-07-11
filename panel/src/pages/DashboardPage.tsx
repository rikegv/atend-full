import { useAuth } from "../lib/auth-context";
import { Shield, Building2 } from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();

  if (!user) return null;

  const isSuperAdmin = user.role === "SUPER_ADMIN";

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-semibold text-[var(--color-text-primary)] tracking-tight">
        Dashboard
      </h1>
      <p className="text-sm text-[var(--color-text-muted)] mt-1">
        Visão geral do sistema
      </p>

      {/* Card de sessão */}
      <div className="mt-8 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div
            className={`flex items-center justify-center w-10 h-10 rounded-xl ${
              isSuperAdmin
                ? "bg-amber-50 text-amber-600"
                : "bg-blue-50 text-blue-600"
            }`}
          >
            {isSuperAdmin ? (
              <Shield size={20} />
            ) : (
              <Building2 size={20} />
            )}
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                Sessão ativa
              </p>
              <p className="text-lg font-semibold text-[var(--color-text-primary)] mt-1">
                {user.name}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                  isSuperAdmin
                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                    : "bg-blue-50 text-blue-700 border border-blue-200"
                }`}
              >
                {isSuperAdmin ? (
                  <Shield size={12} />
                ) : (
                  <Building2 size={12} />
                )}
                {user.role === "SUPER_ADMIN"
                  ? "Super Admin"
                  : "Admin do Tenant"}
              </span>

              {user.tenantName && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[var(--color-background)] text-[var(--color-text-secondary)] border border-[var(--color-border)]">
                  {user.tenantName}
                </span>
              )}
            </div>

            <p className="text-sm text-[var(--color-text-secondary)]">
              {user.email}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
