import { pool } from "../infra/db.js";
import type { AIProvider } from "./provider.js";

const MAX_CHARS_PER_CHUNK = 1500; // ~375 tokens

function splitIntoChunks(text: string): string[] {
  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 0);
  const chunks: string[] = [];

  for (const paragraph of paragraphs) {
    if (paragraph.length <= MAX_CHARS_PER_CHUNK) {
      chunks.push(paragraph.trim());
    } else {
      const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];
      let current = "";
      for (const sentence of sentences) {
        if (
          (current + sentence).length > MAX_CHARS_PER_CHUNK &&
          current.length > 0
        ) {
          chunks.push(current.trim());
          current = sentence;
        } else {
          current += sentence;
        }
      }
      if (current.trim().length > 0) {
        chunks.push(current.trim());
      }
    }
  }

  return chunks.length > 0 ? chunks : [text.trim()];
}

export async function ingestContent(
  provider: AIProvider,
  tenantId: string,
  tipo: "plano" | "faq" | "regra" | "tom",
  conteudo: string,
  origemId?: string,
): Promise<void> {
  const chunks = splitIntoChunks(conteudo);

  for (const chunk of chunks) {
    const embedding = await provider.gerarEmbedding(chunk);
    const vectorStr = `[${embedding.join(",")}]`;

    await pool.query(
      `INSERT INTO knowledge_chunk (tenant_id, tipo, conteudo, embedding, origem_id)
       VALUES ($1, $2, $3, $4::vector, $5)`,
      [tenantId, tipo, chunk, vectorStr, origemId || null],
    );
  }
}

export async function reindexContent(
  provider: AIProvider,
  tenantId: string,
  origemId: string,
  tipo: "plano" | "faq" | "regra" | "tom",
  conteudo: string,
): Promise<void> {
  await pool.query(
    `DELETE FROM knowledge_chunk WHERE tenant_id = $1 AND origem_id = $2`,
    [tenantId, origemId],
  );

  await ingestContent(provider, tenantId, tipo, conteudo, origemId);
}
