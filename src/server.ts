import Fastify from "fastify";
import cors from "@fastify/cors";
import { config } from "./infra/config.js";
import { authRoutes } from "./auth/routes.js";
import { createAIRoutes } from "./ai/routes.js";
import { VertexProvider } from "./ai/vertex-provider.js";

const app = Fastify({ logger: true });

async function start() {
  try {
    await app.register(cors, { origin: true });

    app.get("/health", async () => {
      return { status: "ok" };
    });

    await app.register(authRoutes);

    const aiProvider = new VertexProvider();
    await app.register(createAIRoutes(aiProvider));

    await app.listen({ port: config.port, host: "0.0.0.0" });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
