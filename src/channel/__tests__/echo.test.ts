import "dotenv/config";
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { db, pool } from "../../infra/db.js";
import { tenants, contacts, conversations, messages } from "../../domain/schema.js";
import { MockAdapter } from "../mock-adapter.js";

describe("Echo handler (mock adapter)", () => {
  let tenantId: string;

  before(async () => {
    const [tenant] = await db
      .insert(tenants)
      .values({ name: "Echo Test Tenant" })
      .returning();
    tenantId = tenant!.id;
  });

  after(async () => {
    await db.delete(messages).where(eq(messages.tenantId, tenantId));
    await db.delete(conversations).where(eq(conversations.tenantId, tenantId));
    await db.delete(contacts).where(eq(contacts.tenantId, tenantId));
    await db.delete(tenants).where(eq(tenants.id, tenantId));
    await pool.end();
  });

  it("deve ecoar a mensagem e gravar inbound + outbound no banco", async () => {
    const mock = new MockAdapter();
    await mock.receive({
      senderWaId: "5511999990000",
      content: "oi",
      tenantId,
    });

    // (a) Resposta de eco produzida
    assert.equal(mock.sent.length, 1, "Deve ter enviado 1 mensagem");
    assert.equal(mock.sent[0]!.to, "5511999990000");
    assert.equal(mock.sent[0]!.content, "Recebi: oi");

    // (b) Duas mensagens gravadas no banco
    const rows = await db
      .select()
      .from(messages)
      .where(eq(messages.tenantId, tenantId));

    const inbound = rows.filter((r) => r.direction === "inbound");
    const outbound = rows.filter((r) => r.direction === "outbound");

    assert.equal(inbound.length, 1, "1 mensagem inbound gravada");
    assert.equal(inbound[0]!.content, "oi");
    assert.equal(inbound[0]!.tenantId, tenantId);

    assert.equal(outbound.length, 1, "1 mensagem outbound gravada");
    assert.equal(outbound[0]!.content, "Recebi: oi");
    assert.equal(outbound[0]!.tenantId, tenantId);
  });
});
