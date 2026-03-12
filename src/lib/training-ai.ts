import OpenAI from "openai";

export type SessionAiNotes = {
  summary: string[];
  keyTopics: string[];
  decisions: string[];
  actionItems: Array<{
    ownerRole: string;
    task: string;
    dueDate?: string;
  }>;
  risksOrGaps: string[];
  evidenceQuotes?: string[];
};

function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

export async function generateMeetingFacts(
  metadata: { title: string; agenda: string; date: string; scope: string },
  transcript: string
): Promise<SessionAiNotes> {
  const openai = getOpenAIClient();
  if (!openai) {
    throw new Error("OpenAI API key not configured. Cannot generate meeting notes.");
  }

  const prompt = `
You are an expert educational minutes-taker parsing a training session transcript.
Analyze the transcript and extract structured facts.

SESSION METADATA:
Title: ${metadata.title}
Date: ${metadata.date}
Scope: ${metadata.scope}
Agenda: ${metadata.agenda}

TRANSCRIPT:
${transcript.substring(0, 12000)}

OUTPUT: Return a JSON object exactly matching:
{
  "summary": ["string sentence 1", "string sentence 2"],
  "keyTopics": ["topic 1", "topic 2"],
  "decisions": ["decision 1"],
  "actionItems": [
    { "ownerRole": "string role", "task": "string task", "dueDate": "optional date" }
  ],
  "risksOrGaps": ["string gap 1"],
  "evidenceQuotes": ["string short quote from transcript max 25 words"]
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You extract strictly factual meeting notes into clean JSON." },
      { role: "user", content: prompt }
    ],
    temperature: 0.1,
    response_format: { type: "json_object" }
  });

  const content = response.choices[0].message.content || "{}";
  return JSON.parse(content) as SessionAiNotes;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function formatNarrativeMinutesHtml(facts: SessionAiNotes, metadata: any): string {
  let html = `<h1>Meeting Minutes: ${metadata.title}</h1>`;
  html += `<p><strong>Date:</strong> ${metadata.date}</p>`;
  html += `<p><strong>Scope:</strong> ${metadata.scope}</p>`;
  html += `<hr/>`;

  html += `<h2>Executive Summary</h2><ul>`;
  facts.summary.forEach(s => { html += `<li>${s}</li>`; });
  html += `</ul>`;

  html += `<h2>Key Topics Covered</h2><ul>`;
  facts.keyTopics.forEach(t => { html += `<li>${t}</li>`; });
  html += `</ul>`;

  if (facts.decisions.length > 0) {
    html += `<h2>Decisions Made</h2><ul>`;
    facts.decisions.forEach(d => { html += `<li>${d}</li>`; });
    html += `</ul>`;
  }

  if (facts.actionItems.length > 0) {
    html += `<h2>Action Items</h2><table border="1" cellpadding="8" cellspacing="0"><tr><th>Owner</th><th>Task</th><th>Due</th></tr>`;
    facts.actionItems.forEach(a => {
      html += `<tr><td>${a.ownerRole}</td><td>${a.task}</td><td>${a.dueDate || 'N/A'}</td></tr>`;
    });
    html += `</table>`;
  }

  if (facts.risksOrGaps.length > 0) {
    html += `<h2>Observations & Recommendations</h2><ul>`;
    facts.risksOrGaps.forEach(r => { html += `<li>${r}</li>`; });
    html += `</ul>`;
  }

  html += `<p style="font-size: 0.8em; color: gray; margin-top: 30px;">
    <em>Disclaimer: Notes are generated from meeting transcript by Ozeki AI and reviewed by staff.</em>
  </p>`;

  return html;
}
