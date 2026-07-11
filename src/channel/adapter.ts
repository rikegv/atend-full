/**
 * Interface única de adaptador de canal.
 *
 * Qualquer canal (Baileys, mock, API oficial) implementa este contrato.
 * O resto do sistema depende apenas desta interface — nunca de uma
 * implementação concreta.
 */

export interface IncomingMessage {
  senderWaId: string;
  content: string;
  tenantId: string;
}

export interface ChannelAdapter {
  send(to: string, content: string): Promise<void>;
}
