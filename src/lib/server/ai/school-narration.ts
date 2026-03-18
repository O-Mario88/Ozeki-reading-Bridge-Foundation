import OpenAI from "openai";
import { SchoolFactPack } from "../postgres/repositories/school-reports";

export interface SchoolNarrativeResult {
  executiveSummary: string;
  introduction: string;
  methodology: string;
  findings: string;
  conclusion: string;
  recommendations: string;
  references: string;
}

/**
 * AI Service to generate specialized school performance narratives.
 * Adheres to strict "Fact Pack" lock to ensure data integrity.
 */
export async function generateSchoolNarrative(
  factPack: SchoolFactPack,
  _options?: { reportType?: string }
): Promise<SchoolNarrativeResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      executiveSummary: "AI analysis is currently unavailable.",
      introduction: "System offline.",
      methodology: "Internal fact pack records.",
      findings: "Data summary follows.",
      conclusion: "System offline.",
      recommendations: "Manually review tables.",
      references: "Ozeki Internal Database."
    };
  }

  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_REPORT_MODEL || "gpt-4o";

  const systemPrompt = `
You are an expert Education Program Manager for the Ozeki Reading Bridge Foundation.
Your task is to analyze the "School Fact Pack" JSON data and produce a professional performance narrative.

RULES:
1. EVIDENCE-BASED: Only use figures from the Fact Pack.
2. LITERACY FOCUS: Prioritize average story and comprehension scores.
3. GROWTH TONE: Acknowledge improvements but be honest about challenges.
4. FORMATTING: Use Markdown within the string fields. Use numbered subheadings (e.g. ### 6.1 Literacy Growth) inside the 'findings' and 'recommendations' sections.
5. NO HALLUCINATION: If a metric is 0 or null, do not assume a reason not in the data.

Structure your response as a JSON object with these EXACT string fields:
{
  "executiveSummary": "...",
  "introduction": "Brief context on the school performance report context.",
  "methodology": "Brief data collection context based on the fact pack.",
  "findings": "Detailed markdown analysis of literacy progress, operational efficiency, and teacher support. (You MUST use markdown).",
  "conclusion": "Synthesize the school's trajectory.",
  "recommendations": "Actionable numbered next steps.",
  "references": "Cite the fact pack date range."
}
  `;

  try {
    const response = await client.chat.completions.create({
      model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { 
          role: "user", 
          content: `Fact Pack for ${factPack.schoolName} (${factPack.periodStart} to ${factPack.periodEnd}):\n${JSON.stringify(factPack, null, 2)}`
        }
      ]
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("Empty response");

    return JSON.parse(content) as SchoolNarrativeResult;
  } catch (err) {
    console.error("School AI Narration failed:", err);
    return {
      executiveSummary: "Error during AI generation. Review fact pack tables manually.",
      introduction: "System error.",
      methodology: "System extraction failure.",
      findings: "Technical failure in narrative engine.",
      conclusion: "Unable to assess.",
      recommendations: "Check system logs for OpenAI connectivity.",
      references: "System logs."
    };
  }
}
