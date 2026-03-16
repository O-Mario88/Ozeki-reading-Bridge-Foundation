import OpenAI from "openai";

export interface FinancialNarrationResult {
  executiveSummary: string;
  keyInsights: string[];
  risksAndConcerns: string[];
  recommendations: string[];
}

/**
 * AI Service to generate financial narration from JSON data.
 * Adheres to strict "Fact Pack" lock to prevent hallucinations.
 */
export async function generateFinancialNarration(
  reportType: string,
  data: Record<string, any>,
  options: { period: string; organization: string }
): Promise<FinancialNarrationResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      executiveSummary: "AI Narration is currently unavailable (API Key not set).",
      keyInsights: ["No AI insights generated."],
      risksAndConcerns: [],
      recommendations: ["Ensure OPENAI_API_KEY is configured in server environment."]
    };
  }

  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_REPORT_MODEL || "gpt-4o";

  const systemPrompt = `
You are a senior financial analyst and auditor for the Ozeki Reading Bridge Foundation (a non-profit organization).
Your task is to analyze the provided ${reportType} data (JSON) and produce a professional narrative summary.

RULES:
1. TRUTHFULNESS: Only use data provided in the JSON. If a figure is 0 or null, treat it as such.
2. NO HALLUCINATION: Do not invent transactions, donors, or specific financial events not in the data.
3. TONE: Professional, formal, and analytical.
4. STRUCTURE: Provide an executive summary, top 3-4 key insights, potential risks/concerns, and actionable recommendations.
5. CONTEXT: Focus on fund health, budget variance, and cash flow stability.

Response Format:
Return ONLY a valid JSON object with the following fields:
{
  "executiveSummary": "...",
  "keyInsights": ["...", "..."],
  "risksAndConcerns": ["...", "..."],
  "recommendations": ["...", "..."]
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
          content: `Report Type: ${reportType}\nPeriod: ${options.period}\nOrganization: ${options.organization}\n\nData JSON:\n${JSON.stringify(data, null, 2)}`
        }
      ]
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("Empty response from OpenAI");

    const parsed = JSON.parse(content) as FinancialNarrationResult;
    return {
      executiveSummary: parsed.executiveSummary || "No summary provided.",
      keyInsights: Array.isArray(parsed.keyInsights) ? parsed.keyInsights : [],
      risksAndConcerns: Array.isArray(parsed.risksAndConcerns) ? parsed.risksAndConcerns : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : []
    };
  } catch (error) {
    console.error("Financial Narration Failure:", error);
    return {
      executiveSummary: "Error generating AI narrative. Please review raw data tables.",
      keyInsights: ["Analysis failed due to a technical error."],
      risksAndConcerns: ["System was unable to perform AI risk assessment."],
      recommendations: ["Review financial tables manually for variance compliance."]
    };
  }
}
