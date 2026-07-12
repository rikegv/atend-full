import { getStoredToken } from "./api";

const API_BASE = "/api";

export interface Attendant {
  id: string;
  email: string;
  name: string;
  active: boolean;
  createdAt: string;
}

function authHeaders() {
  return { Authorization: `Bearer ${getStoredToken()}` };
}

function jsonHeaders() {
  return { ...authHeaders(), "Content-Type": "application/json" };
}

export async function listAttendants(): Promise<Attendant[]> {
  const res = await fetch(`${API_BASE}/attendants`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Erro ao listar atendentes");
  return res.json();
}

export async function createAttendant(data: {
  name: string;
  email: string;
  password: string;
}): Promise<Attendant> {
  const res = await fetch(`${API_BASE}/attendants`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { error?: string }).error || "Erro ao criar atendente",
    );
  }
  return res.json();
}

export async function updateAttendant(
  id: string,
  data: { name?: string; password?: string },
): Promise<Attendant> {
  const res = await fetch(`${API_BASE}/attendants/${id}`, {
    method: "PUT",
    headers: jsonHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Erro ao atualizar atendente");
  return res.json();
}

export async function deactivateAttendant(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/attendants/${id}/deactivate`, {
    method: "PATCH",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Erro ao inativar atendente");
}

export async function activateAttendant(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/attendants/${id}/activate`, {
    method: "PATCH",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Erro ao reativar atendente");
}
