import { getStoredToken } from "./api";

const API_BASE = "/api";

export interface Tenant {
  id: string;
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

export async function listTenants(): Promise<Tenant[]> {
  const res = await fetch(`${API_BASE}/admin/tenants`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Erro ao listar academias");
  return res.json();
}

export async function createTenant(data: {
  name: string;
  ownerEmail: string;
  ownerPassword: string;
  ownerName: string;
}): Promise<{ tenant: Tenant; owner: { id: string; email: string; name: string } }> {
  const res = await fetch(`${API_BASE}/admin/tenants`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error || "Erro ao criar academia");
  }
  return res.json();
}

export async function updateTenant(
  id: string,
  data: { name: string },
): Promise<Tenant> {
  const res = await fetch(`${API_BASE}/admin/tenants/${id}`, {
    method: "PUT",
    headers: jsonHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Erro ao atualizar academia");
  return res.json();
}

export async function deactivateTenant(id: string): Promise<Tenant> {
  const res = await fetch(`${API_BASE}/admin/tenants/${id}/deactivate`, {
    method: "PATCH",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Erro ao inativar academia");
  return res.json();
}

export async function activateTenant(id: string): Promise<Tenant> {
  const res = await fetch(`${API_BASE}/admin/tenants/${id}/activate`, {
    method: "PATCH",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Erro ao reativar academia");
  return res.json();
}
