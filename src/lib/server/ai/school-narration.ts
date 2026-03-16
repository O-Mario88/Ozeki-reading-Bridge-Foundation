import OpenAI from "openai";
import { SchoolFactPack } from "../postgres/repositories/school-reports";

export interface SchoolNarrativeResult {
  executiveSummary: string;
  literacyProgressNarrative: string;
  operationalEfficiency: string;
  teacherSupportAndGrowth: string;
  keyActionPoints: string[];
}

/**
 * AI Service to generate specialized school performance narratives.
 * Adheres to strict "Fact Pack" lock to ensure data integrity.
 */
export async function generateSchoolNarrative(
  factPack: SchoolFactPack,
  options?: { reportType?: string }
): Promise<SchoolNarrativeResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      executiveSummary: "AI analysis is currently unavailable.",
      literacyProgressNarrative: "Data summary follows in the tables below.",
      operationalEfficiency: "Review visit frequency in the operational section.",
      teacherSupportAndGrowth: "See evaluation counts for teacher support metrics.",
      keyActionPoints: ["Manually review literacy gains."]
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
4. STRUCTURE: Executive Summary, Literacy Progress, Operational Efficiency (Visits), and Teacher Growth.
5. NO HALLUCINATION: If a metric is 0 or null, do not assume a reason not in the data.

Structure your response as a JSON object:
{
  "executiveSummary": "...",
  "literacyProgressNarrative": "...",
  "operationalEfficiency": "...",
  "teacherSupportAndGrowth": "...",
  "keyActionPoints": ["Point 1", "Point 2"]
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
      literacyProgressNarrative: "Technical failure in narrative engine.",
      operationalEfficiency: "N/A",
      teacherSupportAndGrowth: "N/A",
      keyActionPoints: ["Check system logs for OpenAI connectivity."]
    };
  }
}
