import type { FastifyRequest, FastifyReply } from "fastify";
import jwt from "jsonwebtoken";
import { config } from "../infra/config.js";

export interface AuthPayload {
  userId: string;
  email: string;
  name: string;
  role: "SUPER_ADMIN" | "TENANT_ADMIN";
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

export async function requireRole(
  role: "SUPER_ADMIN" | "TENANT_ADMIN",
) {
  return async function (req: FastifyRequest, reply: FastifyReply) {
    if (!req.user) {
      return reply.status(401).send({ error: "Não autenticado" });
    }
    if (req.user.role !== role && req.user.role !== "SUPER_ADMIN") {
      return reply.status(403).send({ error: "Acesso negado" });
    }
  };
}

export function enforceTenantIsolation(
  req: FastifyRequest,
  tenantId: string,
): boolean {
  if (!req.user) return false;
  if (req.user.role === "SUPER_ADMIN") return true;
  return req.user.tenantId === tenantId;
}
