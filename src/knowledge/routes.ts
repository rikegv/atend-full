import type { FastifyInstance } from "fastify";
import { eq, and } from "drizzle-orm";
import { db } from "../infra/db.js";
import { knowledgeItems } from "../domain/schema.js";
import { requireAuth } from "../auth/middleware.js";
import { ingestContent, reindexContent } from "../ai/ingestion.js";
import { pool } from "../infra/db.js";
import type { AIProvider } from "../ai/provider.js";

type Tipo = "plano" | "faq" | "regra" | "tom";

interface PlanoData {
  nome: string;
  valor: string;
  descricao: string;
}
interface FaqData {
  pergunta: string;
  resposta: string;
}
interface RegraData {
  texto: string;
}
interface TomData {
  texto: string;
}

function composeText(tipo: Tipo, data: PlanoData | FaqData | RegraData | TomData): string {
  switch (tipo) {
    case "plano": {
      const d = data as PlanoData;
      return `Plano ${d.nome}: R$${d.valor}/mês. ${d.descricao}`;
    }
    case "faq": {
      const d = data as FaqData;
      return `${d.pergunta}\n${d.resposta}`;
    }
    case "regra":
      return (data as RegraData).texto;
    case "tom":
      return (data as TomData).texto;
  }
}

export function createKnowledgeRoutes(provider: AIProvider) {
  return async function knowledgeRoutes(app: FastifyInstance) {
    app.addHook("preHandler", requireAuth);

    function resolveTenantId(req: import("fastify").FastifyRequest): string | null {
      const user = req.user!;
      if (user.role === "SUPER_ADMIN") {
        const query = req.query as { tenantId?: string };
        return query.tenantId || null;
      }
      return user.tenantId;
    }

    // ── Listar por tipo ──
    app.get("/api/knowledge/:tipo", async (req, reply) => {
      const tenantId = resolveTenantId(req);
      if (!tenantId) {
        return reply.status(400).send({ error: "Tenant não especificado" });
      }

      const { tipo } = req.params as { tipo: Tipo };
      const items = await db
        .select()
        .from(knowledgeItems)
        .where(
          and(
            eq(knowledgeItems.tenantId, tenantId),
            eq(knowledgeItems.tipo, tipo),
          ),
        )
        .orderBy(knowledgeItems.createdAt);

      return items;
    });

    // ── Criar item ──
    app.post("/api/knowledge/:tipo", async (req, reply) => {
      const tenantId = resolveTenantId(req);
      if (!tenantId) {
        return reply.status(400).send({ error: "Tenant não especificado" });
      }

      const { tipo } = req.params as { tipo: Tipo };
      const data = req.body as PlanoData | FaqData | RegraData | TomData;

      // Tom: só pode haver um por tenant
      if (tipo === "tom") {
        const existing = await db
          .select()
          .from(knowledgeItems)
          .where(
            and(
              eq(knowledgeItems.tenantId, tenantId),
              eq(knowledgeItems.tipo, "tom"),
            ),
          )
          .limit(1);

        if (existing.length > 0) {
          return reply
            .status(409)
            .send({ error: "Já existe um Tom de Voz. Edite o existente." });
        }
      }

      const [item] = await db
        .insert(knowledgeItems)
        .values({ tenantId, tipo, data })
        .returning();

      const text = composeText(tipo, data);
      await ingestContent(provider, tenantId, tipo, text, item!.id);

      return reply.status(201).send(item);
    });

    // ── Editar item ──
    app.put("/api/knowledge/:tipo/:id", async (req, reply) => {
      const tenantId = resolveTenantId(req);
      if (!tenantId) {
        return reply.status(400).send({ error: "Tenant não especificado" });
      }

      const { tipo, id } = req.params as { tipo: Tipo; id: string };
      const data = req.body as PlanoData | FaqData | RegraData | TomData;

      const [existing] = await db
        .select()
        .from(knowledgeItems)
        .where(
          and(
            eq(knowledgeItems.id, id),
            eq(knowledgeItems.tenantId, tenantId),
          ),
        )
        .limit(1);

      if (!existing) {
        return reply.status(404).send({ error: "Item não encontrado" });
      }

      const [updated] = await db
        .update(knowledgeItems)
        .set({ data, updatedAt: new Date() })
        .where(eq(knowledgeItems.id, id))
        .returning();

      const text = composeText(tipo, data);
      await reindexContent(provider, tenantId, id, tipo, text);

      return updated;
    });

    // ── Excluir item ──
    app.delete("/api/knowledge/:tipo/:id", async (req, reply) => {
      const tenantId = resolveTenantId(req);
      if (!tenantId) {
        return reply.status(400).send({ error: "Tenant não especificado" });
      }

      const { id } = req.params as { tipo: Tipo; id: string };

      const [existing] = await db
        .select()
        .from(knowledgeItems)
        .where(
          and(
            eq(knowledgeItems.id, id),
            eq(knowledgeItems.tenantId, tenantId),
          ),
        )
        .limit(1);

      if (!existing) {
        return reply.status(404).send({ error: "Item não encontrado" });
      }

      // Remover chunks associados
      await pool.query(
        "DELETE FROM knowledge_chunk WHERE tenant_id = $1 AND origem_id = $2",
        [tenantId, id],
      );

      await db
        .delete(knowledgeItems)
        .where(eq(knowledgeItems.id, id));

      return reply.status(204).send();
    });
  };
}
