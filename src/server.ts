import Fastify from "fastify";
import cors from "@fastify/cors";
import { config } from "./infra/config.js";
import { authRoutes } from "./auth/routes.js";
import { adminRoutes } from "./admin/routes.js";
import { attendantRoutes } from "./attendant/routes.js";
import { createAIRoutes } from "./ai/routes.js";
import { createKnowledgeRoutes } from "./knowledge/routes.js";
import { VertexProvider } from "./ai/vertex-provider.js";

const app = Fastify({ logger: true });

async function start() {
  try {
    await app.register(cors, { origin: true });

    app.get("/health", async () => {
      return { status: "ok" };
    });

    await app.register(authRoutes);
    await app.register(adminRoutes);
    await app.register(attendantRoutes);

    const aiProvider = new VertexProvider();
    await app.register(createAIRoutes(aiProvider));
    await app.register(createKnowledgeRoutes(aiProvider));

    await app.listen({ port: config.port, host: "0.0.0.0" });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
