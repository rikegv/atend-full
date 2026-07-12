import { useState, useEffect, useCallback } from "react";
import {
  Users,
  Plus,
  Pencil,
  Power,
  PowerOff,
  Check,
  X,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import {
  listAttendants,
  createAttendant,
  updateAttendant,
  deactivateAttendant,
  activateAttendant,
  type Attendant,
} from "../lib/attendant-api";

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
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</h3>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-background)] cursor-pointer">
            Cancelar
          </button>
          <button type="button" onClick={onConfirm} className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 cursor-pointer">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EquipePage() {
  const [attendants, setAttendants] = useState<Attendant[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", password: "" });
  const [confirmDeactivate, setConfirmDeactivate] = useState<Attendant | null>(null);
  const [createForm, setCreateForm] = useState({ name: "", email: "", password: "" });
  const [createError, setCreateError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const list = await listAttendants();
    setAttendants(list);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCreate() {
    setSaving(true);
    setCreateError(null);
    try {
      await createAttendant(createForm);
      setShowCreate(false);
      setCreateForm({ name: "", email: "", password: "" });
      await load();
      setToast("Atendente criado");
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Erro ao criar");
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit(id: string) {
    setSaving(true);
    try {
      const data: { name?: string; password?: string } = {};
      if (editForm.name) data.name = editForm.name;
      if (editForm.password) data.password = editForm.password;
      await updateAttendant(id, data);
      setEditId(null);
      await load();
      setToast("Atendente atualizado");
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Erro ao atualizar");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(att: Attendant) {
    setSaving(true);
    try {
      await deactivateAttendant(att.id);
      setConfirmDeactivate(null);
      await load();
      setToast("Atendente inativado");
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Erro ao inativar");
    } finally {
      setSaving(false);
    }
  }

  async function handleActivate(id: string) {
    setSaving(true);
    try {
      await activateAttendant(id);
      await load();
      setToast("Atendente reativado");
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Erro ao reativar");
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
          <h1 className="text-2xl font-semibold text-[var(--color-text-primary)] tracking-tight">Equipe</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">Gerencie os atendentes da sua academia</p>
        </div>
        {!showCreate && (
          <button type="button" onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[var(--color-sidebar-bg)] text-white hover:bg-[var(--color-sidebar-hover)] cursor-pointer">
            <Plus size={16} /> Novo Atendente
          </button>
        )}
      </div>

      {showCreate && (
        <div className="mb-6 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4">Novo Atendente</h2>
          {createError && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-600">{createError}</div>
          )}
          <div className="space-y-3">
            <input value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} placeholder="Nome" className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)]" />
            <input type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} placeholder="Email" className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)]" />
            <input type="password" value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} placeholder="Senha" className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)]" />
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <button type="button" onClick={() => { setShowCreate(false); setCreateError(null); }} className="px-4 py-2 rounded-lg text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-background)] cursor-pointer">Cancelar</button>
            <button type="button" onClick={handleCreate} disabled={saving || !createForm.name || !createForm.email || !createForm.password} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-[var(--color-sidebar-bg)] text-white hover:bg-[var(--color-sidebar-hover)] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed">
              {saving && <Loader2 size={14} className="animate-spin" />}
              Criar Atendente
            </button>
          </div>
        </div>
      )}

      <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm divide-y divide-[var(--color-border-subtle)]">
        {attendants.length === 0 && (
          <div className="p-8 text-center text-sm text-[var(--color-text-muted)]">Nenhum atendente cadastrado</div>
        )}
        {attendants.map((att) => (
          <div key={att.id} className="flex items-center justify-between px-6 py-4 group">
            {editId === att.id ? (
              <div className="flex items-center gap-2 flex-1 mr-4">
                <div className="flex-1 space-y-2">
                  <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} placeholder="Nome" className="w-full px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)]" />
                  <input type="password" value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} placeholder="Nova senha (opcional)" className="w-full px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)]" />
                </div>
                <button type="button" onClick={() => handleEdit(att.id)} disabled={saving || !editForm.name} className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 cursor-pointer">
                  <Check size={16} />
                </button>
                <button type="button" onClick={() => setEditId(null)} className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-background)] cursor-pointer">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-[var(--color-background)] text-[var(--color-text-secondary)]">
                  <Users size={16} />
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">{att.name}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {att.email}
                    <span className={`ml-2 ${att.active ? "text-emerald-600" : "text-[var(--color-text-muted)]"}`}>
                      {att.active ? "Ativo" : "Inativo"}
                    </span>
                  </p>
                </div>
              </div>
            )}
            {editId !== att.id && (
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button type="button" onClick={() => { setEditId(att.id); setEditForm({ name: att.name, password: "" }); }} className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-background)] cursor-pointer" title="Editar">
                  <Pencil size={14} />
                </button>
                {att.active ? (
                  <button type="button" onClick={() => setConfirmDeactivate(att)} className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-50 cursor-pointer" title="Inativar">
                    <PowerOff size={14} />
                  </button>
                ) : (
                  <button type="button" onClick={() => handleActivate(att.id)} className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-emerald-600 hover:bg-emerald-50 cursor-pointer" title="Reativar">
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
          title="Inativar atendente"
          message={`Tem certeza que deseja inativar "${confirmDeactivate.name}"? Ele não conseguirá mais acessar o sistema.`}
          confirmLabel="Inativar"
          onConfirm={() => handleDeactivate(confirmDeactivate)}
          onCancel={() => setConfirmDeactivate(null)}
        />
      )}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
