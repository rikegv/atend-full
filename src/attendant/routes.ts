import type { FastifyInstance } from "fastify";
import bcrypt from "bcrypt";
import { eq, and } from "drizzle-orm";
import { db } from "../infra/db.js";
import { users } from "../domain/schema.js";
import { requireAuth } from "../auth/middleware.js";

export async function attendantRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);

  function requireTenantAdminRole(
    req: import("fastify").FastifyRequest,
    reply: import("fastify").FastifyReply,
  ) {
    if (!req.user || req.user.role !== "TENANT_ADMIN") {
      return reply
        .status(403)
        .send({ error: "Acesso restrito ao dono da academia" });
    }
    if (!req.user.tenantId) {
      return reply.status(400).send({ error: "Usuário sem tenant vinculado" });
    }
  }

  // ── Listar atendentes da academia do dono ──
  app.get("/api/attendants", async (req, reply) => {
    requireTenantAdminRole(req, reply);
    if (reply.sent) return;

    const list = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        active: users.active,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(
        and(
          eq(users.tenantId, req.user!.tenantId!),
          eq(users.role, "ATENDENTE"),
        ),
      )
      .orderBy(users.createdAt);

    return list;
  });

  // ── Criar atendente ──
  app.post("/api/attendants", async (req, reply) => {
    requireTenantAdminRole(req, reply);
    if (reply.sent) return;

    const { name, email, password } = req.body as {
      name: string;
      email: string;
      password: string;
    };

    if (!name || !email || !password) {
      return reply
        .status(400)
        .send({ error: "Nome, email e senha são obrigatórios" });
    }

    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing) {
      return reply.status(409).send({ error: "Email já cadastrado" });
    }

    const hash = await bcrypt.hash(password, 12);
    const [created] = await db
      .insert(users)
      .values({
        email,
        passwordHash: hash,
        name,
        role: "ATENDENTE",
        tenantId: req.user!.tenantId!,
      })
      .returning();

    return reply.status(201).send({
      id: created!.id,
      email: created!.email,
      name: created!.name,
      active: created!.active,
      createdAt: created!.createdAt,
    });
  });

  // ── Editar atendente (nome e/ou senha) ──
  app.put("/api/attendants/:id", async (req, reply) => {
    requireTenantAdminRole(req, reply);
    if (reply.sent) return;

    const { id } = req.params as { id: string };
    const { name, password } = req.body as {
      name?: string;
      password?: string;
    };

    // Verificar que o atendente pertence ao tenant do dono
    const [att] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.id, id),
          eq(users.tenantId, req.user!.tenantId!),
          eq(users.role, "ATENDENTE"),
        ),
      )
      .limit(1);

    if (!att) {
      return reply.status(404).send({ error: "Atendente não encontrado" });
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (name) updates.name = name;
    if (password) updates.passwordHash = await bcrypt.hash(password, 12);

    const [updated] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();

    return {
      id: updated!.id,
      email: updated!.email,
      name: updated!.name,
      active: updated!.active,
    };
  });

  // ── Inativar atendente ──
  app.patch("/api/attendants/:id/deactivate", async (req, reply) => {
    requireTenantAdminRole(req, reply);
    if (reply.sent) return;

    const { id } = req.params as { id: string };

    const [att] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.id, id),
          eq(users.tenantId, req.user!.tenantId!),
          eq(users.role, "ATENDENTE"),
        ),
      )
      .limit(1);

    if (!att) {
      return reply.status(404).send({ error: "Atendente não encontrado" });
    }

    await db
      .update(users)
      .set({ active: false, updatedAt: new Date() })
      .where(eq(users.id, id));

    return { id, active: false };
  });

  // ── Reativar atendente ──
  app.patch("/api/attendants/:id/activate", async (req, reply) => {
    requireTenantAdminRole(req, reply);
    if (reply.sent) return;

    const { id } = req.params as { id: string };

    const [att] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.id, id),
          eq(users.tenantId, req.user!.tenantId!),
          eq(users.role, "ATENDENTE"),
        ),
      )
      .limit(1);

    if (!att) {
      return reply.status(404).send({ error: "Atendente não encontrado" });
    }

    await db
      .update(users)
      .set({ active: true, updatedAt: new Date() })
      .where(eq(users.id, id));

    return { id, active: true };
  });
}
