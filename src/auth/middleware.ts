import type { FastifyRequest, FastifyReply } from "fastify";
import jwt from "jsonwebtoken";
import { config } from "../infra/config.js";

export interface JwtPayload {
  userId: string;
  email: string;
  name: string;
  role: "SUPER_ADMIN" | "TENANT_ADMIN";
  tenantId: string | null;
}

declare module "fastify" {
  interface FastifyRequest {
    user: JwtPayload;
  }
}

export async function authGuard(req: FastifyRequest, reply: FastifyReply) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return reply.status(401).send({ error: "Token não fornecido" });
  }

  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, config.jwtSecret) as JwtPayload;
    req.user = payload;
  } catch {
    return reply.status(401).send({ error: "Token inválido ou expirado" });
  }
}

/** Restringe acesso apenas a SUPER_ADMIN */
export async function superAdminOnly(req: FastifyRequest, reply: FastifyReply) {
  if (req.user.role !== "SUPER_ADMIN") {
    return reply.status(403).send({ error: "Acesso restrito a super administradores" });
  }
}

/**
 * Extrai o tenant_id efetivo da requisição.
 * - SUPER_ADMIN pode acessar qualquer tenant via query/param.
 * - TENANT_ADMIN só pode acessar o próprio tenant.
 */
export function getEffectiveTenantId(req: FastifyRequest): string | null {
  const { user } = req;

  if (user.role === "SUPER_ADMIN") {
    // Super admin pode especificar tenant via query param
    const queryTenantId = (req.query as Record<string, string>).tenantId;
    return queryTenantId || null;
  }

  // Tenant admin sempre usa o próprio tenant_id
  return user.tenantId;
}

/**
 * Middleware que garante que um TENANT_ADMIN só acessa dados do próprio tenant.
 * Bloqueia se tentar acessar tenant_id diferente do seu.
 */
export async function enforceTenantIsolation(req: FastifyRequest, reply: FastifyReply) {
  if (req.user.role === "SUPER_ADMIN") return; // super admin pode tudo

  const queryTenantId = (req.query as Record<string, string>).tenantId
    || (req.params as Record<string, string>).tenantId;

  if (queryTenantId && queryTenantId !== req.user.tenantId) {
    return reply.status(403).send({ error: "Acesso negado: você não pertence a este tenant" });
  }
}
