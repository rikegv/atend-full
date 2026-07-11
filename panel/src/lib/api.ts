const API_BASE = "/api";

export interface AuthUser {
  userId: string;
  email: string;
  name: string;
  role: "SUPER_ADMIN" | "TENANT_ADMIN";
  tenantId: string | null;
  tenantName: string | null;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export async function login(
  email: string,
  password: string,
): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { error?: string }).error || "Falha na autenticação",
    );
  }

  return res.json();
}

export async function getMe(token: string): Promise<{ user: AuthUser }> {
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error("Sessão inválida");
  }

  return res.json();
}

export function getStoredToken(): string | null {
  return sessionStorage.getItem("token");
}

export function storeSession(token: string, user: AuthUser): void {
  sessionStorage.setItem("token", token);
  sessionStorage.setItem("user", JSON.stringify(user));
}

export function clearSession(): void {
  sessionStorage.removeItem("token");
  sessionStorage.removeItem("user");
}
