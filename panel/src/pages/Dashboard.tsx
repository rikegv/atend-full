import { useAuth } from "../lib/auth";

export function DashboardPage() {
  const { user } = useAuth();

  const roleLabel =
    user?.role === "SUPER_ADMIN" ? "Super Administrador" : "Administrador do Tenant";

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-[var(--color-text-primary)]">
          Dashboard
        </h1>
        <p className="text-[14px] text-[var(--color-text-muted)] mt-1">
          Visão geral do sistema
        </p>
      </div>

      {/* Welcome card */}
      <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] shadow-[var(--shadow-sm)] p-8 max-w-lg">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[var(--color-accent-subtle)] flex items-center justify-center">
            <span className="text-[14px] font-semibold text-[var(--color-accent)]">
              {user?.name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-[15px] font-medium text-[var(--color-text-primary)]">
                {user?.name}
              </p>
              <p className="text-[13px] text-[var(--color-text-muted)]">
                {user?.email}
              </p>
            </div>

            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--color-accent-subtle)] border border-[var(--color-border-subtle)]">
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)]" />
              <span className="text-[12px] font-medium text-[var(--color-text-secondary)]">
                {roleLabel}
              </span>
            </div>

            {user?.role === "TENANT_ADMIN" && user?.tenantId && (
              <p className="text-[12px] text-[var(--color-text-muted)]">
                Tenant: <code className="text-[11px] bg-[var(--color-accent-subtle)] px-1.5 py-0.5 rounded font-mono">{user.tenantId}</code>
              </p>
            )}
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-[var(--color-border-subtle)]">
          <p className="text-[13px] text-[var(--color-text-muted)] leading-relaxed">
            O conteúdo do dashboard será construído em uma próxima etapa.
            Por enquanto, este é o ponto de entrada após a autenticação.
          </p>
        </div>
      </div>
    </div>
  );
}
