import type { FastifyInstance } from "fastify";
import { processQuery } from "./engine.js";
import type { AIProvider } from "./provider.js";

export function createAIRoutes(provider: AIProvider) {
  return async function aiRoutes(app: FastifyInstance) {
    app.post("/api/ai/query", async (req, reply) => {
      const { tenantId, conversationId, message } = req.body as {
        tenantId: string;
        conversationId: string;
        message: string;
      };

      if (!tenantId || !conversationId || !message) {
        return reply
          .status(400)
          .send({ error: "tenantId, conversationId e message são obrigatórios" });
      }

      const result = await processQuery(
        provider,
        tenantId,
        conversationId,
        message,
      );
      return result;
    });
  };
}
