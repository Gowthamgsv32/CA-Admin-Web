// Turns a day's Current Affairs cas entries into TNPSC/competitive-exam-style
// MCQ objects — 2 per cas entry, in en/ta/hi. "qid" is deliberately NOT part
// of the model's output: it's assigned by the caller from its own running
// sequence, matching the "never trust the model with our own numbering"
// convention used elsewhere in this worker (see handleGenerate's day number).
export function buildCaQuestionPrompt(casItems) {
  const articlesBlock = casItems
    .map(
      (c, i) => `
Article ${i + 1}:
Category: ${c.category || 'General'}
Date: ${c.date || ''}
Title: ${c.title_en}
Details: ${c.desc_en || ''}`
    )
    .join('\n')

  return `You are a senior current-affairs question setter for Indian competitive exams (TNPSC, SSC, RRB, bank exams and similar).

Always respond ONLY with a valid JSON array. No markdown, no explanation, no backticks. Just the raw JSON array.

You will be given ${casItems.length} current-affairs article(s) below. Each article's "Details" field is a list of bullet points separated by "~~~~", usually with an emoji prefix (🔹, 📌, etc.) — treat "~~~~" as a line break, not literal content. Some articles also carry a "📘 Static CA" section further down with related background/static general-knowledge facts (acts, founding years, headquarters, historical context) — that section is fair game for questions too, since these exams blend current-affairs with static GK exactly this way.
${articlesBlock}

Task:
For EACH article above, write EXACTLY 2 multiple-choice questions a serious TNPSC/competitive-exam aspirant would need to practice. When an article has a "📘 Static CA" section with a strong standalone fact, draw one question from the main dynamic news and the other from that static fact; otherwise both questions may come from the dynamic news.

Output a single JSON array with exactly ${casItems.length * 2} objects, grouped by article in the same order given (the first 2 objects are for Article 1, the next 2 for Article 2, and so on). Each object must have exactly this shape:
{
  "q": "<question in English>",
  "q_ta": "<same question in Tamil>",
  "q_hi": "<same question in Hindi>",
  "is_m_o": false,
  "ans": "A",
  "o_a": "<option A in English>",
  "o_a_ta": "<option A in Tamil>",
  "o_a_hi": "<option A in Hindi>",
  "o_b": "<option B in English>",
  "o_b_ta": "<option B in Tamil>",
  "o_b_hi": "<option B in Hindi>",
  "o_c": "<option C in English>",
  "o_c_ta": "<option C in Tamil>",
  "o_c_hi": "<option C in Hindi>",
  "o_d": "<option D in English>",
  "o_d_ta": "<option D in Tamil>",
  "o_d_hi": "<option D in Hindi>",
  "exp": "<1-2 sentence explanation in English citing the source fact>",
  "exp_ta": "<same explanation in Tamil>",
  "exp_hi": "<same explanation in Hindi>",
  "ca_c": "<category label>"
}

Rules:
- Exactly 4 options (o_a..o_d), exactly one correct, "ans" holds its letter ("A"|"B"|"C"|"D").
- Rotate the correct answer's letter across questions — do not make every "ans" the same letter.
- Distractors must be plausible (real related names/numbers/places), never absurd or obviously wrong.
- Keep questions and options strictly factual and verifiable from the given text — never invent facts, dates, or numbers not present in the article.
- "ca_c" should normally match the article's given Category; use a more specific standard news-category label (e.g. "International", "National", "Sports", "Science", "Economy", "Person in News", "Awards") only when the question is drawn from a static-GK tangent that's clearly a different topic than the main category.
- Every Tamil and Hindi field must be a real, accurate, natural translation — never left in English, never machine-garbled.
- Do NOT include a "qid" field in any object — it is added separately by the caller.
- Return ONLY the JSON array, nothing else.`
}
