import { useState, useEffect, useCallback } from "react";
import {
  BookOpen,
  HelpCircle,
  ShieldCheck,
  MessageSquareText,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Loader2,
} from "lucide-react";
import {
  listItems,
  createItem,
  updateItem,
  deleteItem,
  type KnowledgeItem,
  type Tipo,
  type PlanoData,
  type FaqData,
  type RegraData,
  type TomData,
} from "../lib/knowledge-api";
import { useAuth } from "../lib/auth-context";
import { useTenantContext } from "../lib/tenant-context";

// ── Toast ──

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2500);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="fixed bottom-6 right-6 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--color-sidebar-bg)] text-white text-sm shadow-lg animate-[fadeIn_0.2s_ease-out]">
      <Check size={16} className="text-emerald-400" />
      {message}
    </div>
  );
}

// ── Section wrapper ──

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-[var(--color-border-subtle)]">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--color-background)] text-[var(--color-text-secondary)]">
          {icon}
        </div>
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)] tracking-tight">
          {title}
        </h2>
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

// ── Planos ──

function PlanosSection({
  items,
  onSave,
  onDelete,
  saving,
}: {
  items: KnowledgeItem[];
  onSave: (tipo: Tipo, data: PlanoData, id?: string) => Promise<void>;
  onDelete: (tipo: Tipo, id: string) => Promise<void>;
  saving: boolean;
}) {
  const [editId, setEditId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<PlanoData>({ nome: "", valor: "", descricao: "" });

  function startEdit(item: KnowledgeItem) {
    setEditId(item.id);
    setForm(item.data as PlanoData);
    setAdding(false);
  }

  function startAdd() {
    setAdding(true);
    setEditId(null);
    setForm({ nome: "", valor: "", descricao: "" });
  }

  function cancel() {
    setEditId(null);
    setAdding(false);
  }

  async function submit() {
    await onSave("plano", form, editId ?? undefined);
    cancel();
  }

  const formRow = (
    <div className="flex flex-col gap-3 p-4 rounded-xl bg-[var(--color-background)] border border-[var(--color-border)]">
      <div className="grid grid-cols-[1fr_120px] gap-3">
        <input
          placeholder="Nome do plano"
          value={form.nome}
          onChange={(e) => setForm({ ...form, nome: e.target.value })}
          className="px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)]"
        />
        <input
          placeholder="Valor (R$)"
          value={form.valor}
          onChange={(e) => setForm({ ...form, valor: e.target.value })}
          className="px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)]"
        />
      </div>
      <textarea
        placeholder="O que inclui"
        rows={2}
        value={form.descricao}
        onChange={(e) => setForm({ ...form, descricao: e.target.value })}
        className="px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)]"
      />
      <div className="flex justify-end gap-2">
        <button type="button" onClick={cancel} className="px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-background)] cursor-pointer">
          Cancelar
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={saving || !form.nome || !form.valor}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--color-sidebar-bg)] text-white hover:bg-[var(--color-sidebar-hover)] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
        >
          {saving && <Loader2 size={12} className="animate-spin" />}
          Salvar
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const d = item.data as PlanoData;
        if (editId === item.id) return <div key={item.id}>{formRow}</div>;
        return (
          <div key={item.id} className="flex items-center justify-between p-4 rounded-xl bg-[var(--color-background)] group">
            <div>
              <p className="text-sm font-medium text-[var(--color-text-primary)]">{d.nome}</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                R${d.valor}/mês — {d.descricao}
              </p>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button type="button" onClick={() => startEdit(item)} className="p-1.5 rounded-lg hover:bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] cursor-pointer">
                <Pencil size={14} />
              </button>
              <button type="button" onClick={() => onDelete("plano", item.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-[var(--color-text-muted)] hover:text-red-500 cursor-pointer">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        );
      })}
      {adding ? (
        formRow
      ) : (
        <button type="button" onClick={startAdd} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-[var(--color-border)] text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:border-[var(--color-text-muted)] w-full justify-center transition-colors cursor-pointer">
          <Plus size={14} /> Adicionar plano
        </button>
      )}
    </div>
  );
}

// ── FAQ ──

function FaqSection({
  items,
  onSave,
  onDelete,
  saving,
}: {
  items: KnowledgeItem[];
  onSave: (tipo: Tipo, data: FaqData, id?: string) => Promise<void>;
  onDelete: (tipo: Tipo, id: string) => Promise<void>;
  saving: boolean;
}) {
  const [editId, setEditId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<FaqData>({ pergunta: "", resposta: "" });

  function startEdit(item: KnowledgeItem) {
    setEditId(item.id);
    setForm(item.data as FaqData);
    setAdding(false);
  }

  function startAdd() {
    setAdding(true);
    setEditId(null);
    setForm({ pergunta: "", resposta: "" });
  }

  function cancel() {
    setEditId(null);
    setAdding(false);
  }

  async function submit() {
    await onSave("faq", form, editId ?? undefined);
    cancel();
  }

  const formRow = (
    <div className="flex flex-col gap-3 p-4 rounded-xl bg-[var(--color-background)] border border-[var(--color-border)]">
      <input
        placeholder="Pergunta"
        value={form.pergunta}
        onChange={(e) => setForm({ ...form, pergunta: e.target.value })}
        className="px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)]"
      />
      <textarea
        placeholder="Resposta"
        rows={2}
        value={form.resposta}
        onChange={(e) => setForm({ ...form, resposta: e.target.value })}
        className="px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)]"
      />
      <div className="flex justify-end gap-2">
        <button type="button" onClick={cancel} className="px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-background)] cursor-pointer">
          Cancelar
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={saving || !form.pergunta || !form.resposta}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--color-sidebar-bg)] text-white hover:bg-[var(--color-sidebar-hover)] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
        >
          {saving && <Loader2 size={12} className="animate-spin" />}
          Salvar
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const d = item.data as FaqData;
        if (editId === item.id) return <div key={item.id}>{formRow}</div>;
        return (
          <div key={item.id} className="flex items-center justify-between p-4 rounded-xl bg-[var(--color-background)] group">
            <div>
              <p className="text-sm font-medium text-[var(--color-text-primary)]">{d.pergunta}</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{d.resposta}</p>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button type="button" onClick={() => startEdit(item)} className="p-1.5 rounded-lg hover:bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] cursor-pointer">
                <Pencil size={14} />
              </button>
              <button type="button" onClick={() => onDelete("faq", item.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-[var(--color-text-muted)] hover:text-red-500 cursor-pointer">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        );
      })}
      {adding ? (
        formRow
      ) : (
        <button type="button" onClick={startAdd} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-[var(--color-border)] text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:border-[var(--color-text-muted)] w-full justify-center transition-colors cursor-pointer">
          <Plus size={14} /> Adicionar FAQ
        </button>
      )}
    </div>
  );
}

// ── Regras ──

function RegrasSection({
  items,
  onSave,
  onDelete,
  saving,
}: {
  items: KnowledgeItem[];
  onSave: (tipo: Tipo, data: RegraData, id?: string) => Promise<void>;
  onDelete: (tipo: Tipo, id: string) => Promise<void>;
  saving: boolean;
}) {
  const [editId, setEditId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<RegraData>({ texto: "" });

  function startEdit(item: KnowledgeItem) {
    setEditId(item.id);
    setForm(item.data as RegraData);
    setAdding(false);
  }

  function startAdd() {
    setAdding(true);
    setEditId(null);
    setForm({ texto: "" });
  }

  function cancel() {
    setEditId(null);
    setAdding(false);
  }

  async function submit() {
    await onSave("regra", form, editId ?? undefined);
    cancel();
  }

  const formRow = (
    <div className="flex flex-col gap-3 p-4 rounded-xl bg-[var(--color-background)] border border-[var(--color-border)]">
      <textarea
        placeholder="Texto da regra (ex: Nunca ofereça desconto fora da tabela)"
        rows={2}
        value={form.texto}
        onChange={(e) => setForm({ texto: e.target.value })}
        className="px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)]"
      />
      <div className="flex justify-end gap-2">
        <button type="button" onClick={cancel} className="px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-background)] cursor-pointer">
          Cancelar
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={saving || !form.texto}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--color-sidebar-bg)] text-white hover:bg-[var(--color-sidebar-hover)] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
        >
          {saving && <Loader2 size={12} className="animate-spin" />}
          Salvar
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const d = item.data as RegraData;
        if (editId === item.id) return <div key={item.id}>{formRow}</div>;
        return (
          <div key={item.id} className="flex items-center justify-between p-4 rounded-xl bg-[var(--color-background)] group">
            <p className="text-sm text-[var(--color-text-primary)]">{d.texto}</p>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <button type="button" onClick={() => startEdit(item)} className="p-1.5 rounded-lg hover:bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] cursor-pointer">
                <Pencil size={14} />
              </button>
              <button type="button" onClick={() => onDelete("regra", item.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-[var(--color-text-muted)] hover:text-red-500 cursor-pointer">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        );
      })}
      {adding ? (
        formRow
      ) : (
        <button type="button" onClick={startAdd} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-[var(--color-border)] text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:border-[var(--color-text-muted)] w-full justify-center transition-colors cursor-pointer">
          <Plus size={14} /> Adicionar regra
        </button>
      )}
    </div>
  );
}

// ── Tom de Voz ──

function TomSection({
  items,
  onSave,
  saving,
}: {
  items: KnowledgeItem[];
  onSave: (tipo: Tipo, data: TomData, id?: string) => Promise<void>;
  saving: boolean;
}) {
  const item = items[0];
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<TomData>({
    texto: item ? (item.data as TomData).texto : "",
  });

  useEffect(() => {
    if (item) setForm({ texto: (item.data as TomData).texto });
  }, [item]);

  async function submit() {
    await onSave("tom", form, item?.id);
    setEditing(false);
  }

  if (!item && !editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-[var(--color-border)] text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:border-[var(--color-text-muted)] w-full justify-center transition-colors cursor-pointer"
      >
        <Plus size={14} /> Definir tom de voz
      </button>
    );
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-3">
        <textarea
          rows={3}
          placeholder="Descreva o tom de voz desejado para as respostas da IA"
          value={form.texto}
          onChange={(e) => setForm({ texto: e.target.value })}
          className="px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)]"
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-background)] cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={saving || !form.texto}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--color-sidebar-bg)] text-white hover:bg-[var(--color-sidebar-hover)] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
          >
            {saving && <Loader2 size={12} className="animate-spin" />}
            Salvar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-between p-4 rounded-xl bg-[var(--color-background)] group">
      <p className="text-sm text-[var(--color-text-primary)]">
        {(item.data as TomData).texto}
      </p>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-opacity shrink-0 cursor-pointer"
      >
        <Pencil size={14} />
      </button>
    </div>
  );
}

// ── Página principal ──

export default function KnowledgeBasePage() {
  const { user } = useAuth();
  const { selectedTenant } = useTenantContext();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  // Para SUPER_ADMIN, usa o tenant selecionado; para TENANT_ADMIN, usa o próprio
  const effectiveTenantId = isSuperAdmin ? selectedTenant?.id : user?.tenantId;
  const effectiveTenantName = isSuperAdmin ? selectedTenant?.name : user?.tenantName;

  const [planos, setPlanos] = useState<KnowledgeItem[]>([]);
  const [faqs, setFaqs] = useState<KnowledgeItem[]>([]);
  const [regras, setRegras] = useState<KnowledgeItem[]>([]);
  const [toms, setToms] = useState<KnowledgeItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!effectiveTenantId) {
      setPlanos([]);
      setFaqs([]);
      setRegras([]);
      setToms([]);
      setLoading(false);
      return;
    }
    const tid = isSuperAdmin ? effectiveTenantId : undefined;
    const [p, f, r, t] = await Promise.all([
      listItems("plano", tid),
      listItems("faq", tid),
      listItems("regra", tid),
      listItems("tom", tid),
    ]);
    setPlanos(p);
    setFaqs(f);
    setRegras(r);
    setToms(t);
    setLoading(false);
  }, [effectiveTenantId, isSuperAdmin]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const tid = isSuperAdmin ? effectiveTenantId : undefined;

  async function handleSave(tipo: Tipo, data: unknown, id?: string) {
    setSaving(true);
    try {
      if (id) {
        await updateItem(tipo, id, data as PlanoData & FaqData & RegraData & TomData, tid);
      } else {
        await createItem(tipo, data as PlanoData & FaqData & RegraData & TomData, tid);
      }
      await load();
      setToast("Base atualizada");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(tipo: Tipo, id: string) {
    setSaving(true);
    try {
      await deleteItem(tipo, id, tid);
      await load();
      setToast("Item removido");
    } finally {
      setSaving(false);
    }
  }

  if (isSuperAdmin && !effectiveTenantId) {
    return (
      <div className="p-8 max-w-3xl">
        <h1 className="text-2xl font-semibold text-[var(--color-text-primary)] tracking-tight">
          Base de Conhecimento
        </h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-4">
          Selecione uma academia no seletor de contexto da sidebar para visualizar a base de conhecimento.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={24} className="animate-spin text-[var(--color-text-muted)]" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--color-text-primary)] tracking-tight">
          Base de Conhecimento
        </h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          {effectiveTenantName
            ? `Conteúdo de ${effectiveTenantName}`
            : "Gerencie o conteúdo que alimenta a IA do atendimento"}
        </p>
      </div>

      <Section title="Planos" icon={<BookOpen size={16} />}>
        <PlanosSection items={planos} onSave={handleSave} onDelete={handleDelete} saving={saving} />
      </Section>

      <Section title="Perguntas Frequentes" icon={<HelpCircle size={16} />}>
        <FaqSection items={faqs} onSave={handleSave} onDelete={handleDelete} saving={saving} />
      </Section>

      <Section title="Regras (Guardrails)" icon={<ShieldCheck size={16} />}>
        <RegrasSection items={regras} onSave={handleSave} onDelete={handleDelete} saving={saving} />
      </Section>

      <Section title="Tom de Voz" icon={<MessageSquareText size={16} />}>
        <TomSection items={toms} onSave={handleSave} saving={saving} />
      </Section>

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
