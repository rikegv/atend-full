import { getStoredToken } from "./api";

const API_BASE = "/api";

export type Tipo = "plano" | "faq" | "regra" | "tom";

export interface PlanoData {
  nome: string;
  valor: string;
  descricao: string;
}
export interface FaqData {
  pergunta: string;
  resposta: string;
}
export interface RegraData {
  texto: string;
}
export interface TomData {
  texto: string;
}

export type ItemData = PlanoData | FaqData | RegraData | TomData;

export interface KnowledgeItem {
  id: string;
  tenantId: string;
  tipo: Tipo;
  data: ItemData;
  createdAt: string;
  updatedAt: string;
}

function authHeaders() {
  return { Authorization: `Bearer ${getStoredToken()}` };
}

function jsonHeaders() {
  return { ...authHeaders(), "Content-Type": "application/json" };
}

export async function listItems(tipo: Tipo, tenantId?: string): Promise<KnowledgeItem[]> {
  const qs = tenantId ? `?tenantId=${tenantId}` : "";
  const res = await fetch(`${API_BASE}/knowledge/${tipo}${qs}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Erro ao listar itens");
  return res.json();
}

export async function createItem(
  tipo: Tipo,
  data: ItemData,
  tenantId?: string,
): Promise<KnowledgeItem> {
  const qs = tenantId ? `?tenantId=${tenantId}` : "";
  const res = await fetch(`${API_BASE}/knowledge/${tipo}${qs}`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error || "Erro ao criar item");
  }
  return res.json();
}

export async function updateItem(
  tipo: Tipo,
  id: string,
  data: ItemData,
  tenantId?: string,
): Promise<KnowledgeItem> {
  const qs = tenantId ? `?tenantId=${tenantId}` : "";
  const res = await fetch(`${API_BASE}/knowledge/${tipo}/${id}${qs}`, {
    method: "PUT",
    headers: jsonHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Erro ao atualizar item");
  return res.json();
}

export async function deleteItem(tipo: Tipo, id: string, tenantId?: string): Promise<void> {
  const qs = tenantId ? `?tenantId=${tenantId}` : "";
  const res = await fetch(`${API_BASE}/knowledge/${tipo}/${id}${qs}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Erro ao excluir item");
}
