// Turns one Current Affairs article into a full "question bank" batch — at
// least 2 questions covering all 4 exam types (MCQ, STATEMENT, MATCH,
// FILL_BLANK), each in en/hi/ta. Ported near-verbatim from the prompt the
// admin already designed and hand-tested; only the topic/text interpolation
// at the end was added. "qid" is deliberately absent from the schema — it's
// assigned by the caller from its own running sequence, matching the
// "never trust the model with our own numbering" convention used elsewhere.
export function buildCaQbPrompt({ topic, text }) {
  return `You are an expert Indian competitive exam question setter
(UPSC, TNPSC, SSC, Banking level).

The input text is trusted editorial current affairs content.
Do NOT mention sources or external references (PIB, The Hindu, etc.)
Do NOT say "according to reports".

TASK:
From the given current affairs text, generate MULTIPLE exam-quality questions.

MANDATORY REQUIREMENTS:
- Generate AT LEAST 2 questions
- Questions MUST include ALL FOUR TYPES:
  1) MCQ (normal multiple-choice question with remembrance tip)
  2) STATEMENT type (2–3 statements with options like "1 and 2 only")
  3) MATCH type (match-the-following, NO drag-and-drop, exam-style options)
  4) FILL_BLANK type (year, place, organisation, index, country, capital etc.)

CONTENT RULES:
- Include BOTH:
  • Dynamic current affairs questions (from the news)
  • Static current affairs questions (background facts related to the topic)
- Assign difficulty for EACH question: Easy / Medium / Hard
- All facts must be standard, exam-accepted facts
- Do NOT invent obscure or risky facts
- Static facts should be safe (location, year, programme, authority)
- Provide a short, exam-friendly remembrance tip for EACH question

LANGUAGE RULES:
- Generate content in THREE languages:
  • English (en)
  • Hindi (hi)
  • Tamil (ta)

OUTPUT RULES:
- Output STRICT JSON ARRAY only
- Do NOT include any explanation outside JSON
- Do NOT add markdown, headings, or comments
- Do NOT include a "qid" field in any object — it is added separately by the caller

EACH QUESTION OBJECT MUST FOLLOW THIS EXACT STRUCTURE:

{
  "type": "MCQ | STATEMENT | MATCH | FILL_BLANK",
  "difficulty": "Easy | Medium | Hard",
  "question": {
    "en": "...",
    "hi": "...",
    "ta": "..."
  },
  "options": {
    "en": { "A": "...", "B": "...", "C": "...", "D": "..." },
    "hi": { "A": "...", "B": "...", "C": "...", "D": "..." },
    "ta": { "A": "...", "B": "...", "C": "...", "D": "..." }
  },
  "answer": "A",
  "explanation": {
    "en": "...",
    "hi": "...",
    "ta": "..."
  },
  "tip": {
    "en": "...",
    "hi": "...",
    "ta": "..."
  }
}

CURRENT AFFAIRS TEXT:
${text}

PRIMARY TOPIC:
${topic}`
}
