/**
 * Interface plugável de provedor de IA.
 *
 * Qualquer provedor (Vertex AI, OpenAI, etc.) implementa este contrato.
 * O motor de IA depende apenas desta interface — nunca de uma
 * implementação concreta.
 */
export interface AIProvider {
  gerarEmbedding(texto: string): Promise<number[]>;
  gerarResposta(prompt: string): Promise<string>;
}
