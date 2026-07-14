/**
 * Ponto de entrada isolado para o adaptador Baileys (WhatsApp real).
 *
 * Uso:  npx tsx src/channel/start-baileys.ts
 *
 * NÃO afeta o servidor principal (npm run dev).
 */

import { BaileysAdapter } from "./baileys-adapter.js";

const adapter = new BaileysAdapter();

adapter.start().catch((err) => {
  console.error("Falha ao iniciar BaileysAdapter:", err);
  process.exit(1);
});
