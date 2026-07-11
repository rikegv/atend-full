import "dotenv/config";
import { pool } from "./db.js";
import { VertexProvider } from "../ai/vertex-provider.js";

const DELAY_MS = 5000;
const MAX_RETRIES = 3;

async function embedWithRetry(
  provider: VertexProvider,
  text: string,
  attempt = 1,
): Promise<number[]> {
  try {
    return await provider.gerarEmbedding(text);
  } catch (err) {
    if (attempt >= MAX_RETRIES) throw err;
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("429")) {
      const wait = DELAY_MS * attempt * 2;
      console.log(`    ⏳ Rate limit, aguardando ${wait / 1000}s (tentativa ${attempt})...`);
      await new Promise((resolve) => setTimeout(resolve, wait));
      return embedWithRetry(provider, text, attempt + 1);
    }
    throw err;
  }
}

async function reindex() {
  const provider = new VertexProvider();

  const chunks = await pool.query(
    "SELECT id, conteudo FROM knowledge_chunk ORDER BY created_at",
  );

  console.log(`Reindexando ${chunks.rows.length} chunks com Vertex AI...`);

  for (let i = 0; i < chunks.rows.length; i++) {
    const row = chunks.rows[i]!;

    const embedding = await embedWithRetry(provider, row.conteudo as string);
    const vectorStr = `[${embedding.join(",")}]`;

    await pool.query(
      "UPDATE knowledge_chunk SET embedding = $1::vector WHERE id = $2",
      [vectorStr, row.id],
    );

    console.log(
      `  ✔ [${i + 1}/${chunks.rows.length}] ${(row.conteudo as string).substring(0, 55)}...`,
    );

    if (i < chunks.rows.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    }
  }

  console.log("Reindexação concluída!");
  await pool.end();
}

reindex().catch((err) => {
  console.error("Erro na reindexação:", err);
  process.exit(1);
});
