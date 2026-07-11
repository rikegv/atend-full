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

function headers() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getStoredToken()}`,
  };
}

export async function listItems(tipo: Tipo): Promise<KnowledgeItem[]> {
  const res = await fetch(`${API_BASE}/knowledge/${tipo}`, {
    headers: headers(),
  });
  if (!res.ok) throw new Error("Erro ao listar itens");
  return res.json();
}

export async function createItem(
  tipo: Tipo,
  data: ItemData,
): Promise<KnowledgeItem> {
  const res = await fetch(`${API_BASE}/knowledge/${tipo}`, {
    method: "POST",
    headers: headers(),
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
): Promise<KnowledgeItem> {
  const res = await fetch(`${API_BASE}/knowledge/${tipo}/${id}`, {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Erro ao atualizar item");
  return res.json();
}

export async function deleteItem(tipo: Tipo, id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/knowledge/${tipo}/${id}`, {
    method: "DELETE",
    headers: headers(),
  });
  if (!res.ok) throw new Error("Erro ao excluir item");
}
