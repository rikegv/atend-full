import { pool } from "../infra/db.js";
import type { AIProvider } from "./provider.js";

export interface RetrievedChunk {
  id: string;
  tipo: string;
  conteudo: string;
  similarity: number;
}

export interface RetrievalResult {
  chunks: RetrievedChunk[];
  confidence: number;
}

const DEFAULT_LIMIT = 5;
export const CONFIDENCE_THRESHOLD = 0.55;

export async function retrieveChunks(
  provider: AIProvider,
  tenantId: string,
  pergunta: string,
  limit: number = DEFAULT_LIMIT,
): Promise<RetrievalResult> {
  const queryEmbedding = await provider.gerarEmbedding(pergunta);
  const vectorStr = `[${queryEmbedding.join(",")}]`;

  const result = await pool.query(
    `SELECT id, tipo, conteudo,
       1 - (embedding <=> $1::vector) AS similarity
     FROM knowledge_chunk
     WHERE tenant_id = $2
     ORDER BY embedding <=> $1::vector ASC
     LIMIT $3`,
    [vectorStr, tenantId, limit],
  );

  const chunks: RetrievedChunk[] = result.rows.map(
    (row: { id: string; tipo: string; conteudo: string; similarity: string }) => ({
      id: row.id as string,
      tipo: row.tipo as string,
      conteudo: row.conteudo as string,
      similarity: Number(row.similarity),
    }),
  );

  const confidence =
    chunks.length > 0 ? Math.max(...chunks.map((c) => c.similarity)) : 0;

  return { chunks, confidence };
}

export async function fetchChunksByTipo(
  tenantId: string,
  tipo: string,
): Promise<RetrievedChunk[]> {
  const result = await pool.query(
    `SELECT id, tipo, conteudo FROM knowledge_chunk WHERE tenant_id = $1 AND tipo = $2`,
    [tenantId, tipo],
  );

  return result.rows.map(
    (row: { id: string; tipo: string; conteudo: string }) => ({
      id: row.id as string,
      tipo: row.tipo as string,
      conteudo: row.conteudo as string,
      similarity: 1,
    }),
  );
}
