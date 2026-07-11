import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../infra/db.js";
import { tenants, contacts } from "../domain/schema.js";
import { authGuard, enforceTenantIsolation, getEffectiveTenantId } from "./middleware.js";

export async function tenantRoutes(app: FastifyInstance) {
  // Rota protegida: listar contatos de um tenant
  // TENANT_ADMIN só vê seus próprios contatos
  app.get(
    "/api/tenants/:tenantId/contacts",
    { preHandler: [authGuard, enforceTenantIsolation] },
    async (req, reply) => {
      const { tenantId } = req.params as { tenantId: string };

      // Para TENANT_ADMIN, o middleware já garantiu que tenantId === user.tenantId
      const result = await db
        .select()
        .from(contacts)
        .where(eq(contacts.tenantId, tenantId));

      return { contacts: result };
    }
  );

  // Rota protegida: listar tenants (apenas SUPER_ADMIN)
  app.get(
    "/api/tenants",
    { preHandler: [authGuard] },
    async (req, reply) => {
      if (req.user.role !== "SUPER_ADMIN") {
        return reply.status(403).send({ error: "Acesso restrito" });
      }

      const result = await db.select().from(tenants);
      return { tenants: result };
    }
  );
}
