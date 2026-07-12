import type { FastifyRequest, FastifyReply } from "fastify";
import jwt from "jsonwebtoken";
import { config } from "../infra/config.js";

export type UserRole = "SUPER_ADMIN" | "TENANT_ADMIN" | "ATENDENTE";

export interface AuthPayload {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  tenantId: string | null;
}

declare module "fastify" {
  interface FastifyRequest {
    user?: AuthPayload;
  }
}

export async function requireAuth(req: FastifyRequest, reply: FastifyReply) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return reply.status(401).send({ error: "Token não fornecido" });
  }

  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, config.jwtSecret) as AuthPayload;
    req.user = payload;
  } catch {
    return reply.status(401).send({ error: "Token inválido ou expirado" });
  }
}

export async function requireSuperAdmin(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) {
    return reply.status(401).send({ error: "Não autenticado" });
  }
  if (req.user.role !== "SUPER_ADMIN") {
    return reply.status(403).send({ error: "Acesso restrito a Super Admin" });
  }
}

export async function requireTenantAdmin(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) {
    return reply.status(401).send({ error: "Não autenticado" });
  }
  if (req.user.role === "ATENDENTE") {
    return reply.status(403).send({ error: "Acesso restrito a administradores" });
  }
}

export function enforceTenantIsolation(
  req: FastifyRequest,
  tenantId: string,
): boolean {
  if (!req.user) return false;
  if (req.user.role === "SUPER_ADMIN") return true;
  return req.user.tenantId === tenantId;
}
