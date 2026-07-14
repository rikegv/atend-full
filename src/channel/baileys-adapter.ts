import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  type WASocket,
} from "@whiskeysockets/baileys";
import type { Boom } from "@hapi/boom";
import qrcode from "qrcode-terminal";
import { eq } from "drizzle-orm";
import { db } from "../infra/db.js";
import { tenants } from "../domain/schema.js";
import type { ChannelAdapter } from "./adapter.js";
import { handleIncomingMessage } from "./handler.js";

const AUTH_DIR = "baileys_auth";
const TENANT_NAME = "Academia Teste";

export class BaileysAdapter implements ChannelAdapter {
  private sock: WASocket | null = null;
  private tenantId: string = "";

  async start(): Promise<void> {
    // Resolve tenant ID from DB
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.name, TENANT_NAME));

    if (!tenant) {
      throw new Error(
        `Tenant "${TENANT_NAME}" not found. Run npm run db:seed first.`,
      );
    }

    this.tenantId = tenant.id;
    console.log(`Tenant "${TENANT_NAME}" -> ${this.tenantId}`);

    await this.connect();
  }

  async send(to: string, content: string): Promise<void> {
    if (!this.sock) throw new Error("WhatsApp not connected");

    // Baileys expects JID format: number@s.whatsapp.net
    const jid = to.includes("@") ? to : `${to}@s.whatsapp.net`;
    await this.sock.sendMessage(jid, { text: content });
  }

  private async connect(): Promise<void> {
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false, // we handle QR ourselves
    });

    this.sock = sock;

    // ── QR Code ───────────────────────────────────────────────
    sock.ev.on("connection.update", (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        console.log("\n========== QR CODE ==========");
        console.log("Abra o WhatsApp > Aparelhos conectados > Conectar aparelho");
        console.log("Leia o QR abaixo com o celular de teste:\n");
        qrcode.generate(qr, { small: true });
        console.log("=============================\n");
      }

      if (connection === "close") {
        const reason = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const loggedOut = reason === DisconnectReason.loggedOut;

        if (loggedOut) {
          console.log("Sessao encerrada (logout). Reinicie para reconectar.");
        } else {
          console.log(`Conexao fechada (reason=${reason}). Reconectando...`);
          void this.connect();
        }
      }

      if (connection === "open") {
        console.log("WhatsApp conectado com sucesso!");
      }
    });

    // ── Persist credentials on update ─────────────────────────
    sock.ev.on("creds.update", saveCreds);

    // ── Incoming messages ─────────────────────────────────────
    sock.ev.on("messages.upsert", async ({ messages: msgs, type }) => {
      if (type !== "notify") return;

      for (const msg of msgs) {
        // Skip own messages, status broadcasts, and empty messages
        if (msg.key.fromMe) continue;
        if (msg.key.remoteJid === "status@broadcast") continue;

        const text =
          msg.message?.conversation ||
          msg.message?.extendedTextMessage?.text;

        if (!text) continue; // ignore media, stickers, etc.

        // Extract phone number from JID (e.g. 5511999998888@s.whatsapp.net -> 5511999998888)
        const senderWaId = msg.key.remoteJid!.replace("@s.whatsapp.net", "");

        console.log(`[MSG IN] ${senderWaId}: ${text}`);

        try {
          await handleIncomingMessage(
            { senderWaId, content: text, tenantId: this.tenantId },
            this,
          );
          console.log(`[MSG OUT] ${senderWaId}: Recebi: ${text}`);
        } catch (err) {
          console.error("Erro ao processar mensagem:", err);
        }
      }
    });
  }
}
