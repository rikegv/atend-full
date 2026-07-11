import { eq, and } from "drizzle-orm";
import { db } from "../infra/db.js";
import {
  contacts,
  conversations,
  messages,
} from "../domain/schema.js";
import type { IncomingMessage, ChannelAdapter } from "./adapter.js";

export async function handleIncomingMessage(
  incoming: IncomingMessage,
  adapter: ChannelAdapter,
): Promise<void> {
  const { senderWaId, content, tenantId } = incoming;

  // ── Contact: localizar ou criar ───────────────────────────────
  let [contact] = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.tenantId, tenantId), eq(contacts.waId, senderWaId)));

  if (!contact) {
    [contact] = await db
      .insert(contacts)
      .values({ tenantId, waId: senderWaId })
      .returning();
  }

  // ── Conversation: localizar ativa ou criar ────────────────────
  let [conversation] = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.tenantId, tenantId),
        eq(conversations.contactId, contact!.id),
      ),
    );

  if (!conversation) {
    [conversation] = await db
      .insert(conversations)
      .values({ tenantId, contactId: contact!.id })
      .returning();
  }

  // ── Mensagem recebida ─────────────────────────────────────────
  await db.insert(messages).values({
    tenantId,
    conversationId: conversation!.id,
    direction: "inbound",
    content,
  });

  // ── Eco ────────────────────────────────────────────────────────
  const reply = `Recebi: ${content}`;

  // ── Mensagem enviada ──────────────────────────────────────────
  await db.insert(messages).values({
    tenantId,
    conversationId: conversation!.id,
    direction: "outbound",
    content: reply,
  });

  // ── Enviar pelo adaptador ─────────────────────────────────────
  await adapter.send(senderWaId, reply);
}
