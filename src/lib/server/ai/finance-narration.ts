import OpenAI from "openai";

export interface FinancialNarrationResult {
  executiveSummary: string;
  introduction: string;
  methodology: string;
  findings: string;
  conclusion: string;
  recommendations: string;
  references: string;
}

/**
 * AI Service to generate financial narration from JSON data.
 * Adheres to strict "Fact Pack" lock to prevent hallucinations.
 */
export async function generateFinancialNarration(
  reportType: string,
  data: unknown,
  options: { period: string; organization: string }
): Promise<FinancialNarrationResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      executiveSummary: "AI Narration is currently unavailable (API Key not set).",
      introduction: "AI Analysis offline.",
      methodology: "Internal financial ledgers.",
      findings: "No AI insights generated.",
      conclusion: "Risk assessment offline.",
      recommendations: "Ensure OPENAI_API_KEY is configured in server environment.",
      references: "Ozeki Internal Operations System."
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
3. TONE: Professional, formal, and highly academic. Ensure output resembles a professional audited financial report.
4. FORMATTING: Use Markdown within the string fields. Use numbered subheadings (e.g. ### 6.1 Variance Analysis) inside the 'findings' and 'recommendations' sections where applicable.

Response Format:
Return ONLY a valid JSON object with the following string fields:
{
  "executiveSummary": "...",
  "introduction": "Brief context on the report objectives.",
  "methodology": "Describe the data extracted and methods of analysis.",
  "findings": "Detailed markdown analysis of fund health, variance, stability. (You MUST use markdown).",
  "conclusion": "Synthesize the financial trajectory.",
  "recommendations": "Actionable numbered next steps based on analysis.",
  "references": "Cite the specific ledger or organization systems analyzed."
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
      introduction: parsed.introduction || "No introduction provided.",
      methodology: parsed.methodology || "Data from internal ledgers.",
      findings: parsed.findings || "No findings analyzed.",
      conclusion: parsed.conclusion || "No conclusion generated.",
      recommendations: parsed.recommendations || "No recommendations generated.",
      references: parsed.references || "Ozeki Internal Database."
    };
  } catch (error) {
    console.error("Financial Narration Failure:", error);
    return {
      executiveSummary: "Error generating AI narrative. Please review raw data tables.",
      introduction: "Error encountered.",
      methodology: "System extraction failure.",
      findings: "Analysis failed due to a technical error.",
      conclusion: "Unable to assess.",
      recommendations: "Review financial tables manually.",
      references: "System logs."
    };
  }
}
