import { useState, useEffect, useCallback } from "react";
import {
  Building2,
  Plus,
  Pencil,
  Power,
  PowerOff,
  Check,
  Loader2,
  X,
  AlertTriangle,
} from "lucide-react";
import {
  listTenants,
  createTenant,
  updateTenant,
  deactivateTenant,
  activateTenant,
  type Tenant,
} from "../lib/admin-api";

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2500);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="fixed bottom-6 right-6 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--color-sidebar-bg)] text-white text-sm shadow-lg">
      <Check size={16} className="text-emerald-400" />
      {message}
    </div>
  );
}

function ConfirmModal({
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-xl max-w-sm w-full mx-4 p-6">
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-50 text-amber-600 shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
              {title}
            </h3>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">
              {message}
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-background)] cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 cursor-pointer"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AcademiasPage() {
  const [tenantsList, setTenantsList] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [confirmDeactivate, setConfirmDeactivate] = useState<Tenant | null>(null);

  const [createForm, setCreateForm] = useState({
    name: "",
    ownerName: "",
    ownerEmail: "",
    ownerPassword: "",
  });
  const [createError, setCreateError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const list = await listTenants();
    setTenantsList(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate() {
    setSaving(true);
    setCreateError(null);
    try {
      await createTenant(createForm);
      setShowCreateForm(false);
      setCreateForm({ name: "", ownerName: "", ownerEmail: "", ownerPassword: "" });
      await load();
      setToast("Academia criada");
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Erro ao criar");
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit(id: string) {
    setSaving(true);
    try {
      await updateTenant(id, { name: editName });
      setEditId(null);
      await load();
      setToast("Academia atualizada");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(tenant: Tenant) {
    setSaving(true);
    try {
      await deactivateTenant(tenant.id);
      setConfirmDeactivate(null);
      await load();
      setToast("Academia inativada");
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Erro ao inativar academia");
    } finally {
      setSaving(false);
    }
  }

  async function handleActivate(id: string) {
    setSaving(true);
    try {
      await activateTenant(id);
      await load();
      setToast("Academia reativada");
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Erro ao reativar academia");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={24} className="animate-spin text-[var(--color-text-muted)]" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-text-primary)] tracking-tight">
            Academias
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Gerencie as academias cadastradas no sistema
          </p>
        </div>
        {!showCreateForm && (
          <button
            type="button"
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[var(--color-sidebar-bg)] text-white hover:bg-[var(--color-sidebar-hover)] cursor-pointer"
          >
            <Plus size={16} /> Nova Academia
          </button>
        )}
      </div>

      {/* Create form */}
      {showCreateForm && (
        <div className="mb-6 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4">
            Nova Academia
          </h2>
          {createError && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-600">
              {createError}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider mb-1.5">
                Nome da academia
              </label>
              <input
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder="Ex: Academia Power Fitness"
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)]"
              />
            </div>
            <div className="border-t border-[var(--color-border-subtle)] pt-4">
              <p className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-3">
                Dados do dono (TENANT_ADMIN)
              </p>
              <div className="grid grid-cols-2 gap-3">
                <input
                  value={createForm.ownerName}
                  onChange={(e) => setCreateForm({ ...createForm, ownerName: e.target.value })}
                  placeholder="Nome do dono"
                  className="px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)]"
                />
                <input
                  type="email"
                  value={createForm.ownerEmail}
                  onChange={(e) => setCreateForm({ ...createForm, ownerEmail: e.target.value })}
                  placeholder="Email do dono"
                  className="px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)]"
                />
              </div>
              <input
                type="password"
                value={createForm.ownerPassword}
                onChange={(e) => setCreateForm({ ...createForm, ownerPassword: e.target.value })}
                placeholder="Senha inicial do dono"
                className="mt-3 w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)]"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={() => { setShowCreateForm(false); setCreateError(null); }}
              className="px-4 py-2 rounded-lg text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-background)] cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={saving || !createForm.name || !createForm.ownerEmail || !createForm.ownerPassword || !createForm.ownerName}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-[var(--color-sidebar-bg)] text-white hover:bg-[var(--color-sidebar-hover)] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              Criar Academia
            </button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm divide-y divide-[var(--color-border-subtle)]">
        {tenantsList.length === 0 && (
          <div className="p-8 text-center text-sm text-[var(--color-text-muted)]">
            Nenhuma academia cadastrada
          </div>
        )}
        {tenantsList.map((t) => (
          <div key={t.id} className="flex items-center justify-between px-6 py-4 group">
            {editId === t.id ? (
              <div className="flex items-center gap-2 flex-1 mr-4">
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)]"
                />
                <button
                  type="button"
                  onClick={() => handleEdit(t.id)}
                  disabled={saving || !editName}
                  className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 cursor-pointer"
                >
                  <Check size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setEditId(null)}
                  className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-background)] cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-[var(--color-background)] text-[var(--color-text-secondary)]">
                  <Building2 size={16} />
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">
                    {t.name}
                  </p>
                  <span
                    className={`inline-block mt-0.5 text-xs font-medium ${
                      t.active ? "text-emerald-600" : "text-[var(--color-text-muted)]"
                    }`}
                  >
                    {t.active ? "Ativa" : "Inativa"}
                  </span>
                </div>
              </div>
            )}

            {editId !== t.id && (
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => { setEditId(t.id); setEditName(t.name); }}
                  className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-background)] cursor-pointer"
                  title="Editar"
                >
                  <Pencil size={14} />
                </button>
                {t.active ? (
                  <button
                    type="button"
                    onClick={() => setConfirmDeactivate(t)}
                    className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-50 cursor-pointer"
                    title="Inativar"
                  >
                    <PowerOff size={14} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleActivate(t.id)}
                    className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-emerald-600 hover:bg-emerald-50 cursor-pointer"
                    title="Reativar"
                  >
                    <Power size={14} />
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {confirmDeactivate && (
        <ConfirmModal
          title="Inativar academia"
          message={`Tem certeza que deseja inativar "${confirmDeactivate.name}"? Os usuários dela perderão acesso ao sistema.`}
          confirmLabel="Inativar"
          onConfirm={() => handleDeactivate(confirmDeactivate)}
          onCancel={() => setConfirmDeactivate(null)}
        />
      )}

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
