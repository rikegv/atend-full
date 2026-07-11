import type { ChannelAdapter, IncomingMessage } from "./adapter.js";
import { handleIncomingMessage } from "./handler.js";

export interface SentMessage {
  to: string;
  content: string;
}

export class MockAdapter implements ChannelAdapter {
  sent: SentMessage[] = [];

  async send(to: string, content: string): Promise<void> {
    this.sent.push({ to, content });
  }

  /** Simula uma mensagem chegando pelo canal. */
  async receive(incoming: IncomingMessage): Promise<void> {
    await handleIncomingMessage(incoming, this);
  }
}
