import type { FastifyInstance } from "fastify";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { db } from "../infra/db.js";
import { tenants, users } from "../domain/schema.js";
import { requireAuth, requireSuperAdmin } from "../auth/middleware.js";

export async function adminRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);
  app.addHook("preHandler", requireSuperAdmin);

  // ── Listar academias ──
  app.get("/api/admin/tenants", async () => {
    const list = await db
      .select({
        id: tenants.id,
        name: tenants.name,
        active: tenants.active,
        createdAt: tenants.createdAt,
      })
      .from(tenants)
      .orderBy(tenants.createdAt);

    return list;
  });

  // ── Criar academia + dono ──
  app.post("/api/admin/tenants", async (req, reply) => {
    const { name, ownerEmail, ownerPassword, ownerName } = req.body as {
      name: string;
      ownerEmail: string;
      ownerPassword: string;
      ownerName: string;
    };

    if (!name || !ownerEmail || !ownerPassword || !ownerName) {
      return reply.status(400).send({
        error: "Nome da academia, email, senha e nome do dono são obrigatórios",
      });
    }

    // Verificar email duplicado
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.email, ownerEmail))
      .limit(1);

    if (existing) {
      return reply.status(409).send({ error: "Email já cadastrado" });
    }

    const [tenant] = await db
      .insert(tenants)
      .values({ name })
      .returning();

    const hash = await bcrypt.hash(ownerPassword, 12);
    const [owner] = await db
      .insert(users)
      .values({
        email: ownerEmail,
        passwordHash: hash,
        name: ownerName,
        role: "TENANT_ADMIN",
        tenantId: tenant!.id,
      })
      .returning();

    return reply.status(201).send({
      tenant: { id: tenant!.id, name: tenant!.name, active: tenant!.active },
      owner: { id: owner!.id, email: owner!.email, name: owner!.name },
    });
  });

  // ── Editar academia ──
  app.put("/api/admin/tenants/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const { name } = req.body as { name: string };

    if (!name) {
      return reply.status(400).send({ error: "Nome é obrigatório" });
    }

    const [updated] = await db
      .update(tenants)
      .set({ name, updatedAt: new Date() })
      .where(eq(tenants.id, id))
      .returning();

    if (!updated) {
      return reply.status(404).send({ error: "Academia não encontrada" });
    }

    return { id: updated.id, name: updated.name, active: updated.active };
  });

  // ── Inativar academia ──
  app.patch("/api/admin/tenants/:id/deactivate", async (req, reply) => {
    const { id } = req.params as { id: string };

    const [updated] = await db
      .update(tenants)
      .set({ active: false, updatedAt: new Date() })
      .where(eq(tenants.id, id))
      .returning();

    if (!updated) {
      return reply.status(404).send({ error: "Academia não encontrada" });
    }

    return { id: updated.id, name: updated.name, active: updated.active };
  });

  // ── Reativar academia ──
  app.patch("/api/admin/tenants/:id/activate", async (req, reply) => {
    const { id } = req.params as { id: string };

    const [updated] = await db
      .update(tenants)
      .set({ active: true, updatedAt: new Date() })
      .where(eq(tenants.id, id))
      .returning();

    if (!updated) {
      return reply.status(404).send({ error: "Academia não encontrada" });
    }

    return { id: updated.id, name: updated.name, active: updated.active };
  });
}
