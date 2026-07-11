import type { FastifyInstance } from "fastify";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { db } from "../infra/db.js";
import { users, tenants } from "../domain/schema.js";
import { config } from "../infra/config.js";
import { requireAuth, enforceTenantIsolation, type AuthPayload } from "./middleware.js";

export async function authRoutes(app: FastifyInstance) {
  app.post("/api/auth/login", async (req, reply) => {
    const { email, password } = req.body as {
      email?: string;
      password?: string;
    };

    if (!email || !password) {
      return reply
        .status(400)
        .send({ error: "Email e senha são obrigatórios" });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      return reply.status(401).send({ error: "Credenciais inválidas" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return reply.status(401).send({ error: "Credenciais inválidas" });
    }

    let tenantName: string | null = null;
    if (user.tenantId) {
      const [t] = await db
        .select({ name: tenants.name })
        .from(tenants)
        .where(eq(tenants.id, user.tenantId))
        .limit(1);
      tenantName = t?.name ?? null;
    }

    const payload: AuthPayload = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
    };

    const token = jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn,
    });

    return {
      token,
      user: { ...payload, tenantName },
    };
  });

  app.post("/api/auth/logout", async (_req, reply) => {
    return reply.send({ ok: true });
  });

  app.get(
    "/api/auth/me",
    { preHandler: requireAuth },
    async (req, reply) => {
      const user = req.user!;

      let tenantName: string | null = null;
      if (user.tenantId) {
        const [t] = await db
          .select({ name: tenants.name })
          .from(tenants)
          .where(eq(tenants.id, user.tenantId))
          .limit(1);
        tenantName = t?.name ?? null;
      }

      return reply.send({ user: { ...user, tenantName } });
    },
  );

  app.get(
    "/api/auth/check-tenant/:tenantId",
    { preHandler: requireAuth },
    async (req, reply) => {
      const { tenantId } = req.params as { tenantId: string };
      if (!enforceTenantIsolation(req, tenantId)) {
        return reply
          .status(403)
          .send({ error: "Acesso negado: você não pertence a este tenant" });
      }
      return reply.send({ allowed: true, tenantId });
    },
  );
}
