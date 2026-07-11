import type { AIProvider } from "./provider.js";

export interface GuardrailVerdict {
  violou: boolean;
  motivo: string;
}

export async function validateGuardrail(
  provider: AIProvider,
  resposta: string,
  regras: string[],
): Promise<GuardrailVerdict> {
  if (regras.length === 0) {
    return { violou: false, motivo: "" };
  }

  const prompt = `Você é um validador de conformidade. Analise se a resposta abaixo viola ALGUMA das regras listadas.

=== REGRAS ===
${regras.map((r, i) => `${i + 1}. ${r}`).join("\n")}

=== RESPOSTA A VALIDAR ===
${resposta}

Responda APENAS com um JSON válido no formato:
{"violou": true/false, "motivo": "explicação breve se violou, string vazia se não violou"}

JSON:`;

  const result = await provider.gerarResposta(prompt);

  try {
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : result) as GuardrailVerdict;
    return {
      violou: Boolean(parsed.violou),
      motivo: String(parsed.motivo || ""),
    };
  } catch {
    return { violou: true, motivo: "Falha ao validar resposta contra regras" };
  }
}
