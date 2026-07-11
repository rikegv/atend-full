import "dotenv/config";
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { db, pool } from "../../infra/db.js";
import { tenants, contacts, conversations } from "../../domain/schema.js";
import type { AIProvider } from "../provider.js";
import { ingestContent } from "../ingestion.js";
import { retrieveChunks } from "../retrieval.js";
import { processQuery } from "../engine.js";
import { validateGuardrail } from "../guardrail.js";

// ── Mock Provider ───────────────────────────────────────────────
// Retorna embeddings determinísticos baseados em palavras-chave do texto,
// de modo que chunks e queries da mesma categoria tenham alta similaridade
// de cosseno, e categorias distintas sejam ortogonais.

class MockAIProvider implements AIProvider {
  async gerarEmbedding(texto: string): Promise<number[]> {
    const vec = new Array(768).fill(0);
    const lower = texto.toLowerCase();

    if (
      lower.includes("plano") ||
      lower.includes("basic") ||
      lower.includes("gold") ||
      lower.includes("premium") ||
      lower.includes("musculação") ||
      lower.includes("inclui") ||
      lower.includes("salon") ||
      lower.includes("valor") ||
      lower.includes("mês")
    ) {
      vec[0] = 0.9;
      vec[1] = 0.4;
    }
    if (
      lower.includes("horário") ||
      lower.includes("day-use") ||
      lower.includes("personal") ||
      lower.includes("funcionamento")
    ) {
      vec[2] = 0.9;
      vec[3] = 0.4;
    }
    if (
      lower.includes("desconto") ||
      lower.includes("nunca") ||
      lower.includes("ofereça") ||
      lower.includes("proib") ||
      lower.includes("regra") ||
      lower.includes("promet")
    ) {
      vec[4] = 0.9;
      vec[5] = 0.4;
    }
    if (
      lower.includes("tom") ||
      lower.includes("amigável") ||
      lower.includes("profissional")
    ) {
      vec[6] = 0.9;
      vec[7] = 0.4;
    }

    const hasMatch = vec.some((v: number) => v > 0);
    if (!hasMatch) {
      vec[500] = 0.1;
    }

    vec[10] = texto.length / 10000;
    return vec;
  }

  async gerarResposta(prompt: string): Promise<string> {
    // Prompt de validação de guardrail
    if (prompt.includes("RESPOSTA A VALIDAR")) {
      // Checar "desconto" apenas na seção da RESPOSTA, não nas REGRAS
      const respostaSection = prompt.split("RESPOSTA A VALIDAR")[1] || "";
      if (respostaSection.includes("desconto")) {
        return '{"violou": true, "motivo": "Resposta oferece desconto fora da tabela"}';
      }
      return '{"violou": false, "motivo": ""}';
    }

    // Geração principal — verificar a PERGUNTA ATUAL, não o prompt inteiro
    const perguntaSection = prompt.split("PERGUNTA ATUAL")[1] || prompt;

    if (
      perguntaSection.includes("Basic") ||
      perguntaSection.includes("Gold") ||
      perguntaSection.includes("Premium") ||
      perguntaSection.includes("plano")
    ) {
      if (perguntaSection.toLowerCase().includes("desconto")) {
        return "Posso te oferecer um desconto especial de 20% no plano Gold!";
      }
      return "Nossos planos são: Basic (R$89/mês com musculação), Gold (R$149/mês com aulas coletivas) e Premium (R$249/mês completo com personal).";
    }

    if (perguntaSection.toLowerCase().includes("desconto")) {
      return "Posso te oferecer um desconto especial de 20% no plano Gold!";
    }

    return "Não tenho informações suficientes para responder essa pergunta.";
  }
}

// ── Setup / Teardown ────────────────────────────────────────────

describe("Motor de IA", () => {
  let tenantIdA: string;
  let tenantIdB: string;
  let conversationId: string;
  const mockProvider = new MockAIProvider();

  before(async () => {
    // Garantir extensão pgvector
    await pool.query("CREATE EXTENSION IF NOT EXISTS vector");

    // Garantir tabela knowledge_chunk
    await pool.query(`
      CREATE TABLE IF NOT EXISTS knowledge_chunk (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        tenant_id UUID NOT NULL REFERENCES tenants(id),
        tipo TEXT NOT NULL,
        conteudo TEXT NOT NULL,
        embedding vector(768) NOT NULL,
        origem_id UUID,
        created_at TIMESTAMPTZ DEFAULT now() NOT NULL
      )
    `);

    // Criar tenants de teste
    const [tA] = await db
      .insert(tenants)
      .values({ name: "AI Test Tenant A" })
      .returning();
    const [tB] = await db
      .insert(tenants)
      .values({ name: "AI Test Tenant B" })
      .returning();

    tenantIdA = tA!.id;
    tenantIdB = tB!.id;

    // Criar contact e conversation para tenant A
    const [contact] = await db
      .insert(contacts)
      .values({ tenantId: tenantIdA, waId: "5511777770000" })
      .returning();
    const [conv] = await db
      .insert(conversations)
      .values({ tenantId: tenantIdA, contactId: contact!.id })
      .returning();
    conversationId = conv!.id;

    // Popular base de conhecimento do tenant A
    await ingestContent(
      mockProvider,
      tenantIdA,
      "plano",
      "Plano Basic: R$89/mês. Inclui acesso à musculação e área de cardio.",
    );
    await ingestContent(
      mockProvider,
      tenantIdA,
      "plano",
      "Plano Gold: R$149/mês. Inclui musculação, cardio e todas as aulas coletivas.",
    );
    await ingestContent(
      mockProvider,
      tenantIdA,
      "plano",
      "Plano Premium: R$249/mês. Inclui tudo do Gold + 2 sessões de personal trainer por semana.",
    );
    await ingestContent(
      mockProvider,
      tenantIdA,
      "faq",
      "Horário de funcionamento: Segunda a sexta das 6h às 23h. Sábados das 8h às 18h.",
    );
    await ingestContent(
      mockProvider,
      tenantIdA,
      "regra",
      "Nunca ofereça desconto fora da tabela de preços oficial.",
    );
    await ingestContent(
      mockProvider,
      tenantIdA,
      "regra",
      "Nunca prometa resultado de emagrecimento ou ganho muscular com prazo definido.",
    );
    await ingestContent(
      mockProvider,
      tenantIdA,
      "tom",
      "Seja amigável e profissional nas respostas.",
    );

    // Popular base do tenant B (conteúdo diferente)
    await ingestContent(
      mockProvider,
      tenantIdB,
      "plano",
      "Plano Salon: R$200/mês. Inclui corte e escova ilimitados.",
    );
  });

  after(async () => {
    // Limpar dados de teste
    await pool.query("DELETE FROM knowledge_chunk WHERE tenant_id = $1", [
      tenantIdA,
    ]);
    await pool.query("DELETE FROM knowledge_chunk WHERE tenant_id = $1", [
      tenantIdB,
    ]);
    await pool.end();
  });

  // ── Teste 1: Isolamento multi-tenant na recuperação ─────────

  it("recuperação retorna chunks do tenant certo e nunca de outro", async () => {
    const resultA = await retrieveChunks(
      mockProvider,
      tenantIdA,
      "Quais são os planos disponíveis?",
    );

    assert.ok(resultA.chunks.length > 0, "Deve encontrar chunks do tenant A");

    const allContentA = resultA.chunks.map((c) => c.conteudo).join(" ");
    assert.ok(
      !allContentA.includes("Salon"),
      "Chunks do tenant A NÃO devem conter dados do tenant B",
    );
    assert.ok(
      allContentA.includes("Basic") ||
        allContentA.includes("Gold") ||
        allContentA.includes("Premium"),
      "Chunks do tenant A devem conter seus próprios planos",
    );

    // Confirmar que tenant B vê apenas seus dados
    const resultB = await retrieveChunks(
      mockProvider,
      tenantIdB,
      "Quais são os planos?",
    );
    assert.ok(resultB.chunks.length > 0, "Deve encontrar chunks do tenant B");
    const allContentB = resultB.chunks.map((c) => c.conteudo).join(" ");
    assert.ok(
      allContentB.includes("Salon"),
      "Tenant B deve encontrar seus próprios chunks",
    );
    assert.ok(
      !allContentB.includes("Basic"),
      "Tenant B NÃO deve ver chunks do tenant A",
    );
  });

  // ── Teste 2: Pergunta sobre plano retorna resposta fundamentada ─

  it("pergunta sobre plano retorna resposta fundamentada nos chunks certos", async () => {
    const result = await processQuery(
      mockProvider,
      tenantIdA,
      conversationId,
      "Quais são os planos da academia?",
    );

    assert.equal(result.isHandoff, false, "Não deve ser handoff");
    assert.equal(result.guardrailPassed, true, "Guardrail deve passar");
    assert.ok(result.confidence >= 0.3, "Confiança deve ser >= 0.3");
    assert.ok(result.response.length > 0, "Deve ter resposta");
    assert.ok(result.sourceChunks.length > 0, "Deve ter sourceChunks");
    assert.ok(
      result.sourceChunks.some(
        (c) => c.tipo === "plano" || c.tipo === "faq",
      ),
      "sourceChunks devem conter chunks de contexto",
    );
  });

  // ── Teste 3: Pedido de desconto → guardrail → handoff ──────

  it("pergunta pedindo desconto aciona validador e resulta em handoff", async () => {
    const result = await processQuery(
      mockProvider,
      tenantIdA,
      conversationId,
      "Quero um desconto no plano Gold da academia",
    );

    assert.equal(result.isHandoff, true, "Deve resultar em handoff");
    assert.equal(
      result.guardrailPassed,
      false,
      "Guardrail deve reprovar (violação detectada)",
    );
    assert.ok(
      result.response.includes("equipe"),
      "Resposta de handoff deve ser mensagem neutra",
    );
  });

  // ── Teste 4: Sem correspondência → handoff por baixa confiança ─

  it("pergunta sem correspondência resulta em handoff por baixa confiança", async () => {
    const result = await processQuery(
      mockProvider,
      tenantIdA,
      conversationId,
      "Qual a previsão do tempo para amanhã em Júpiter?",
    );

    assert.equal(
      result.isHandoff,
      true,
      "Deve resultar em handoff por baixa confiança",
    );
    assert.ok(
      result.confidence < 0.3,
      `Confiança deve ser < 0.3, recebido: ${result.confidence}`,
    );
    assert.equal(
      result.guardrailPassed,
      true,
      "Guardrail não deve ter sido acionado (handoff antes da geração)",
    );
  });

  // ── Teste 5: Validador de guardrail isolado ─────────────────

  it("validador de guardrail detecta violação de regra isoladamente", async () => {
    const regras = [
      "Nunca ofereça desconto fora da tabela de preços oficial.",
    ];

    const respostaVioladora =
      "Posso te oferecer um desconto especial de 20% no plano Gold!";
    const verdict = await validateGuardrail(
      mockProvider,
      respostaVioladora,
      regras,
    );
    assert.equal(verdict.violou, true, "Deve detectar violação");

    const respostaOK =
      "O plano Gold custa R$149/mês e inclui musculação e aulas coletivas.";
    const verdictOK = await validateGuardrail(mockProvider, respostaOK, regras);
    assert.equal(verdictOK.violou, false, "Não deve detectar violação");
  });
});
