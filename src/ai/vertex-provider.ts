import { GoogleAuth } from "google-auth-library";
import type { AIProvider } from "./provider.js";
import { config } from "../infra/config.js";

/**
 * Provedor de IA via Google Vertex AI.
 *
 * Usa o modelo text-embedding-004 para embeddings (768 dimensões)
 * e gemini-1.5-flash para geração de texto.
 *
 * Autenticação: GoogleAuth lê automaticamente a variável de ambiente
 * GOOGLE_APPLICATION_CREDENTIALS (caminho para o JSON da service account).
 */
export class VertexProvider implements AIProvider {
  private auth: GoogleAuth;

  constructor() {
    this.auth = new GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });
  }

  async gerarEmbedding(texto: string): Promise<number[]> {
    const { project, location } = this.getProjectConfig();
    const client = await this.auth.getClient();
    const { token } = await client.getAccessToken();

    const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/text-embedding-004:predict`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        instances: [{ content: texto }],
      }),
    });

    if (!res.ok) {
      throw new Error(
        `Vertex embedding error: ${res.status} ${await res.text()}`,
      );
    }

    const data = (await res.json()) as {
      predictions: Array<{ embeddings: { values: number[] } }>;
    };
    return data.predictions[0]!.embeddings.values;
  }

  async gerarResposta(prompt: string): Promise<string> {
    const { project, location } = this.getProjectConfig();
    const client = await this.auth.getClient();
    const { token } = await client.getAccessToken();

    const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/gemini-2.5-flash:generateContent`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2 },
      }),
    });

    if (!res.ok) {
      throw new Error(
        `Vertex generation error: ${res.status} ${await res.text()}`,
      );
    }

    const data = (await res.json()) as {
      candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
    };
    return data.candidates[0]!.content.parts[0]!.text;
  }

  private getProjectConfig() {
    if (!config.vertexProject || !config.vertexLocation) {
      throw new Error(
        "VERTEX_PROJECT e VERTEX_LOCATION devem estar configurados no .env",
      );
    }
    return { project: config.vertexProject, location: config.vertexLocation };
  }
}
