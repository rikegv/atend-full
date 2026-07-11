import type { AIProvider } from "./provider.js";
import {
  retrieveChunks,
  fetchChunksByTipo,
  CONFIDENCE_THRESHOLD,
} from "./retrieval.js";
import { composePrompt, getConversationHistory } from "./prompt.js";
import { validateGuardrail } from "./guardrail.js";

const HANDOFF_MESSAGE =
  "Vou te conectar com alguém da equipe para te ajudar melhor.";

export interface AIQueryResult {
  response: string;
  confidence: number;
  sourceChunks: Array<{ conteudo: string; tipo: string; similarity: number }>;
  isHandoff: boolean;
  guardrailPassed: boolean;
}

export async function processQuery(
  provider: AIProvider,
  tenantId: string,
  conversationId: string,
  message: string,
): Promise<AIQueryResult> {
  // 1. Recuperar chunks relevantes por similaridade
  const retrieval = await retrieveChunks(provider, tenantId, message);

  // 2. Filtrar chunks de contexto (plano, faq) — regras e tom são buscados à parte
  const contextChunks = retrieval.chunks.filter(
    (c) => c.tipo === "plano" || c.tipo === "faq",
  );

  // 3. Calcular confiança com base nos chunks de contexto
  const confidence =
    contextChunks.length > 0
      ? Math.max(...contextChunks.map((c) => c.similarity))
      : 0;

  // 4. Confiança baixa → handoff
  if (confidence < CONFIDENCE_THRESHOLD) {
    return {
      response: HANDOFF_MESSAGE,
      confidence,
      sourceChunks: retrieval.chunks.map((c) => ({
        conteudo: c.conteudo,
        tipo: c.tipo,
        similarity: c.similarity,
      })),
      isHandoff: true,
      guardrailPassed: true,
    };
  }

  // 5. Buscar TODAS as regras e tom do tenant (independente de similaridade)
  const regraChunks = await fetchChunksByTipo(tenantId, "regra");
  const tomChunks = await fetchChunksByTipo(tenantId, "tom");
  const tomChunk = tomChunks[0] || null;

  // 6. Histórico da conversa (últimas 3 mensagens)
  const historico = await getConversationHistory(conversationId);

  // 7. Compor prompt
  const prompt = composePrompt(
    contextChunks,
    regraChunks,
    tomChunk,
    historico,
    message,
  );

  // 8. Gerar resposta
  const resposta = await provider.gerarResposta(prompt);

  // 9. Validar guardrails
  const regrasTexto = regraChunks.map((c) => c.conteudo);
  const verdict = await validateGuardrail(provider, resposta, regrasTexto);

  // 10. Guardrail violado → handoff
  if (verdict.violou) {
    return {
      response: HANDOFF_MESSAGE,
      confidence,
      sourceChunks: contextChunks.map((c) => ({
        conteudo: c.conteudo,
        tipo: c.tipo,
        similarity: c.similarity,
      })),
      isHandoff: true,
      guardrailPassed: false,
    };
  }

  // 11. Resposta aprovada
  return {
    response: resposta,
    confidence,
    sourceChunks: contextChunks.map((c) => ({
      conteudo: c.conteudo,
      tipo: c.tipo,
      similarity: c.similarity,
    })),
    isHandoff: false,
    guardrailPassed: true,
  };
}
