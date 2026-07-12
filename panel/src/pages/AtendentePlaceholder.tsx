import { useAuth } from "../lib/auth-context";
import { MessageSquare } from "lucide-react";

export default function AtendentePlaceholder() {
  const { user } = useAuth();

  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center max-w-sm">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[var(--color-background)] border border-[var(--color-border)] mb-4">
          <MessageSquare size={24} className="text-[var(--color-text-muted)]" />
        </div>
        <h1 className="text-lg font-semibold text-[var(--color-text-primary)] tracking-tight">
          Olá, {user?.name}
        </h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-2">
          Seu espaço de atendimento aparecerá aqui em breve.
        </p>
      </div>
    </div>
  );
}
