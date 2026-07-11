import "dotenv/config";
import bcrypt from "bcrypt";
import { db, pool } from "./db.js";
import { tenants, users, knowledgeItems } from "../domain/schema.js";
import { ingestContent } from "../ai/ingestion.js";
import type { AIProvider } from "../ai/provider.js";

// Provedor de seed: embeddings determinísticos por categoria (sem dependência externa)
const seedProvider: AIProvider = {
  async gerarEmbedding(texto: string): Promise<number[]> {
    const vec = new Array(768).fill(0);
    const lower = texto.toLowerCase();
    if (
      lower.includes("plano") || lower.includes("basic") ||
      lower.includes("gold") || lower.includes("premium") ||
      lower.includes("musculação") || lower.includes("aulas") ||
      lower.includes("personal") || lower.includes("mês")
    ) {
      vec[0] = 0.9; vec[1] = 0.4;
    }
    if (
      lower.includes("horário") || lower.includes("day-use") ||
      lower.includes("funcionamento") || lower.includes("sábado") ||
      lower.includes("feriado") || lower.includes("estacionamento") ||
      lower.includes("cancelamento")
    ) {
      vec[2] = 0.9; vec[3] = 0.4;
    }
    if (
      lower.includes("desconto") || lower.includes("nunca") ||
      lower.includes("ofereça") || lower.includes("proib") ||
      lower.includes("prometa") || lower.includes("regra")
    ) {
      vec[4] = 0.9; vec[5] = 0.4;
    }
    if (lower.includes("tom") || lower.includes("amigável") || lower.includes("profissional")) {
      vec[6] = 0.9; vec[7] = 0.4;
    }
    vec[10] = texto.length / 10000;
    return vec;
  },
  async gerarResposta(): Promise<string> {
    throw new Error("Seed não gera respostas");
  },
};

interface SeedItem {
  tipo: "plano" | "faq" | "regra" | "tom";
  data: Record<string, string>;
  texto: string;
}

async function seedKnowledgeItem(
  tenantId: string,
  item: SeedItem,
): Promise<void> {
  const [created] = await db
    .insert(knowledgeItems)
    .values({ tenantId, tipo: item.tipo, data: item.data })
    .returning();

  await ingestContent(seedProvider, tenantId, item.tipo, item.texto, created!.id);
}

async function seed() {
  console.log("Seeding...");

  // 1. Criar tenant de teste
  const [tenant] = await db
    .insert(tenants)
    .values({
      name: "Academia Teste",
      config: {
        tomDeVoz: "amigável e profissional",
        guardrails: [],
        dadosOperacionais: {},
      },
    })
    .returning();

  console.log(`Tenant '${tenant!.name}' criado (id: ${tenant!.id})`);

  // 2. Criar SUPER_ADMIN
  const superHash = await bcrypt.hash("admin123", 12);
  const [superAdmin] = await db
    .insert(users)
    .values({
      email: "admin@admin.com",
      passwordHash: superHash,
      name: "Super Administrador",
      role: "SUPER_ADMIN",
      tenantId: null,
    })
    .returning();

  console.log(`SUPER_ADMIN criado: ${superAdmin!.email}`);

  // 3. Criar TENANT_ADMIN vinculado ao tenant de teste
  const tenantHash = await bcrypt.hash("tenant123", 12);
  const [tenantAdmin] = await db
    .insert(users)
    .values({
      email: "academia@teste.com",
      passwordHash: tenantHash,
      name: "Admin Academia Teste",
      role: "TENANT_ADMIN",
      tenantId: tenant!.id,
    })
    .returning();

  console.log(`TENANT_ADMIN criado: ${tenantAdmin!.email} (tenant: ${tenant!.id})`);

  // ── Base de conhecimento da Academia Teste ──────────────────

  // Garantir extensão pgvector
  await pool.query("CREATE EXTENSION IF NOT EXISTS vector");

  // Garantir tabela knowledge_chunk (caso a migration não tenha rodado)
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

  // Criar índice pgvector para busca por similaridade de cosseno
  await pool.query(`
    CREATE INDEX IF NOT EXISTS knowledge_chunk_embedding_idx
    ON knowledge_chunk USING hnsw (embedding vector_cosine_ops)
  `);

  // Garantir tabela knowledge_item (caso a migration não tenha rodado)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS knowledge_item (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      tenant_id UUID NOT NULL REFERENCES tenants(id),
      tipo TEXT NOT NULL,
      data JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
    )
  `);

  console.log("Populando base de conhecimento...");

  const tid = tenant!.id;

  // Planos
  await seedKnowledgeItem(tid, {
    tipo: "plano",
    data: { nome: "Basic", valor: "89", descricao: "Inclui acesso à musculação e área de cardio. Sem limite de horário." },
    texto: "Plano Basic: R$89/mês. Inclui acesso à musculação e área de cardio. Sem limite de horário.",
  });
  await seedKnowledgeItem(tid, {
    tipo: "plano",
    data: { nome: "Gold", valor: "149", descricao: "Inclui musculação, cardio e todas as aulas coletivas (spinning, funcional, yoga). Sem limite de horário." },
    texto: "Plano Gold: R$149/mês. Inclui musculação, cardio e todas as aulas coletivas (spinning, funcional, yoga). Sem limite de horário.",
  });
  await seedKnowledgeItem(tid, {
    tipo: "plano",
    data: { nome: "Premium", valor: "249", descricao: "Inclui tudo do Gold + 2 sessões de personal trainer por semana + acesso ao spa." },
    texto: "Plano Premium: R$249/mês. Inclui tudo do Gold + 2 sessões de personal trainer por semana + acesso ao spa.",
  });

  // FAQs
  await seedKnowledgeItem(tid, {
    tipo: "faq",
    data: { pergunta: "Qual o horário de funcionamento?", resposta: "Segunda a sexta das 6h às 23h. Sábados das 8h às 18h. Domingos e feriados das 8h às 14h." },
    texto: "Horário de funcionamento: Segunda a sexta das 6h às 23h. Sábados das 8h às 18h. Domingos e feriados das 8h às 14h.",
  });
  await seedKnowledgeItem(tid, {
    tipo: "faq",
    data: { pergunta: "Vocês oferecem day-use?", resposta: "Oferecemos day-use por R$35. Inclui acesso a todas as áreas por um dia. Sujeito a disponibilidade." },
    texto: "Day-use: Oferecemos day-use por R$35. Inclui acesso a todas as áreas por um dia. Sujeito a disponibilidade.",
  });
  await seedKnowledgeItem(tid, {
    tipo: "faq",
    data: { pergunta: "Quanto custa uma sessão avulsa de personal trainer?", resposta: "Sessões avulsas de personal custam R$80/hora. No plano Premium, 2 sessões semanais já estão inclusas." },
    texto: "Personal trainer: Sessões avulsas de personal custam R$80/hora. No plano Premium, 2 sessões semanais já estão inclusas.",
  });
  await seedKnowledgeItem(tid, {
    tipo: "faq",
    data: { pergunta: "Como funciona o cancelamento?", resposta: "O cancelamento pode ser feito com 30 dias de antecedência. Não há multa após o período de fidelidade de 3 meses." },
    texto: "Cancelamento: O cancelamento pode ser feito com 30 dias de antecedência. Não há multa após o período de fidelidade de 3 meses.",
  });
  await seedKnowledgeItem(tid, {
    tipo: "faq",
    data: { pergunta: "A academia tem estacionamento?", resposta: "Estacionamento gratuito para alunos mediante apresentação da carteirinha. Vagas limitadas." },
    texto: "Estacionamento: Estacionamento gratuito para alunos mediante apresentação da carteirinha. Vagas limitadas.",
  });

  // Regras (guardrails)
  await seedKnowledgeItem(tid, {
    tipo: "regra",
    data: { texto: "Nunca ofereça desconto fora da tabela de preços oficial. Não crie promoções ou condições especiais por conta própria." },
    texto: "Nunca ofereça desconto fora da tabela de preços oficial. Não crie promoções ou condições especiais por conta própria.",
  });
  await seedKnowledgeItem(tid, {
    tipo: "regra",
    data: { texto: "Nunca prometa resultado de emagrecimento ou ganho muscular com prazo definido. Resultados variam de pessoa para pessoa." },
    texto: "Nunca prometa resultado de emagrecimento ou ganho muscular com prazo definido. Resultados variam de pessoa para pessoa.",
  });

  // Tom de voz
  await seedKnowledgeItem(tid, {
    tipo: "tom",
    data: { texto: "Seja amigável e profissional. Use linguagem acolhedora mas objetiva. Chame o cliente pelo nome quando possível. Evite gírias e linguagem muito informal." },
    texto: "Seja amigável e profissional. Use linguagem acolhedora mas objetiva. Chame o cliente pelo nome quando possível. Evite gírias e linguagem muito informal.",
  });

  console.log("Base de conhecimento populada com sucesso!");

  console.log("\n══════════════════════════════════════════");
  console.log("  CREDENCIAIS DE ACESSO");
  console.log("══════════════════════════════════════════");
  console.log("  SUPER_ADMIN:  admin@admin.com / admin123");
  console.log("  TENANT_ADMIN: academia@teste.com / tenant123");
  console.log("══════════════════════════════════════════\n");

  await pool.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
