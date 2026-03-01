import OpenAI from "openai";
import { ImpactReportFactPack, ImpactReportNarrative, ImpactReportSectionNarrative } from "./types";
import { buildImpactNarrative } from "./db";

export async function generateImpactNarrativeFromAI(
    factPack: ImpactReportFactPack,
    options?: { partnerName?: string | null }
): Promise<ImpactReportNarrative> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        console.warn("OPENAI_API_KEY not set. Falling back to local narrative generation.");
        return buildImpactNarrative(factPack, options);
    }

    const client = new OpenAI({ apiKey });
    const model = process.env.OPENAI_REPORT_MODEL || "gpt-5";

    const systemInstruction = `You are an expert educational data analyst for the Ozeki Reading Bridge Foundation.
Your task is to analyze the provided ImpactReportFactPack JSON data and produce a professional, evidence-locked ImpactReportNarrative.

Rules:
1. ONLY use data explicitly provided in the Fact Pack.
2. If a metric is null or missing, explicitly state "Data not available for this period." Do not invent numbers.
3. Be professional, concise, and focus on actionable insights.
4. The output MUST be a valid JSON object strictly matching the structure described.

Return JSON in this structure:
{
  "variant": string (e.g., "Standard", "Executive"),
  "factsLockInstruction": "Use only numbers in this Fact Pack...",
  "executiveSummary": string,
  "biggestImprovements": string[] (up to 3 concise points on learning/quality gains),
  "keyChallenges": string[] (up to 3 concise points on blockers, low coverage, or poor assessment outcomes),
  "nextPriorities": string[] (up to 3 clear, actionable next steps based on the facts),
  "methodsNote": string,
  "limitations": string,
  "sectionNarratives": [
    {
      "sectionId": string,
      "title": string,
      "summary": string
    }
  ]
}

Make sure to map sectionNarratives to the ones provided in the template field of the input.`;

    try {
        const response = await client.chat.completions.create({
            model,
            response_format: { type: "json_object" },
            messages: [
                { role: "system", content: systemInstruction },
                {
                    role: "user",
                    content: `Generate a narrative for this FactPack. Partner name: ${options?.partnerName || "None"}. \n\n${JSON.stringify(factPack, null, 2)}`
                }
            ]
        });

        const content = response.choices[0]?.message.content;
        if (!content) {
            throw new Error("Empty response from OpenAI");
        }

        const aiNarrative = JSON.parse(content) as Partial<ImpactReportNarrative>;

        // Ensure all required fields exist by merging with the standard template data
        const fallbackTemplate = buildImpactNarrative(factPack, options).template;

        return {
            variant: aiNarrative.variant || fallbackTemplate.variant,
            factsLockInstruction: aiNarrative.factsLockInstruction || "Use only numbers in this Fact Pack. If a metric is missing, return: Data not available for this period.",
            executiveSummary: aiNarrative.executiveSummary || "",
            biggestImprovements: Array.isArray(aiNarrative.biggestImprovements) ? aiNarrative.biggestImprovements : [],
            keyChallenges: Array.isArray(aiNarrative.keyChallenges) ? aiNarrative.keyChallenges : [],
            nextPriorities: Array.isArray(aiNarrative.nextPriorities) ? aiNarrative.nextPriorities : [],
            methodsNote: aiNarrative.methodsNote || "Narrative was generated from the Report Fact Pack only.",
            limitations: aiNarrative.limitations || "Where baseline/endline pairs are missing, trend interpretation is limited.",
            sectionNarratives: Array.isArray(aiNarrative.sectionNarratives) ? aiNarrative.sectionNarratives as ImpactReportSectionNarrative[] : [],
            template: fallbackTemplate // Always use our strict template definitions from the backend
        };
    } catch (error) {
        console.error("OpenAI Report Generation failed:", error);
        console.warn("Falling back to basic procedural generation.");
        return buildImpactNarrative(factPack, options);
    }
}
