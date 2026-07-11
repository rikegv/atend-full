import { eq, desc } from "drizzle-orm";
import { db } from "../infra/db.js";
import { messages } from "../domain/schema.js";
import type { RetrievedChunk } from "./retrieval.js";

export function composePrompt(
  contextChunks: RetrievedChunk[],
  regraChunks: RetrievedChunk[],
  tomChunk: RetrievedChunk | null,
  historico: Array<{ direction: string; content: string }>,
  pergunta: string,
): string {
  let prompt = "";

  if (contextChunks.length > 0) {
    prompt += "=== CONTEXTO (base de conhecimento) ===\n";
    for (const chunk of contextChunks) {
      prompt += `[${chunk.tipo}] ${chunk.conteudo}\n\n`;
    }
  }

  if (regraChunks.length > 0) {
    prompt += "=== REGRAS (siga rigorosamente) ===\n";
    for (const chunk of regraChunks) {
      prompt += `- ${chunk.conteudo}\n`;
    }
    prompt += "\n";
  }

  if (tomChunk) {
    prompt += `=== TOM DE VOZ ===\n${tomChunk.conteudo}\n\n`;
  }

  if (historico.length > 0) {
    prompt += "=== HISTÓRICO RECENTE ===\n";
    for (const msg of historico) {
      const label = msg.direction === "inbound" ? "Cliente" : "Assistente";
      prompt += `${label}: ${msg.content}\n`;
    }
    prompt += "\n";
  }

  prompt += `=== PERGUNTA ATUAL ===\nCliente: ${pergunta}\n\n`;
  prompt +=
    "Responda de forma útil e precisa, baseando-se APENAS no contexto fornecido. Se não tiver informação suficiente, indique isso.";

  return prompt;
}

export async function getConversationHistory(
  conversationId: string,
  limit: number = 3,
): Promise<Array<{ direction: string; content: string }>> {
  const rows = await db
    .select({ direction: messages.direction, content: messages.content })
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(desc(messages.timestamp))
    .limit(limit);

  return rows.reverse();
}
