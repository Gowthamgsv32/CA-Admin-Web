// Turns one selected Current Affairs article into short "recall game" content
// for competitive exam aspirants (TNPSC, SSC, etc). Called as (article) where
// article = { title_en, desc_en, category, date }.
export function buildRecallGamePrompt(article) {
  return `You are an expert content creator for a competitive exam "Recall Game" app used by TNPSC, SSC, and other Indian competitive exam aspirants.

Always respond ONLY with a valid JSON object. No markdown, no explanation, no backticks. Just raw JSON.

Source current affairs article:
Category: ${article.category || 'General'}
Date: ${article.date || ''}
Title: ${article.title_en}
Details: ${article.desc_en || ''}

Task:
Turn this article into short, punchy "recall" content. Analyse the topic in the context of related developments over the past 6 months (same sport/scheme/person/organisation) and connect it to relevant static GK (capitals, historic facts, notable records) wherever useful — this is exactly the current-affairs + static-GK blend these exams test.

Keep every piece of writing SHORT AND PUNCHY — no long paragraphs.

Return a JSON object with exactly these fields:
{
  "question": "<a punchy headline-style title for this recall card, under 15 words>",
  "hint": [
    "<hint 1 - a short teaser clue, under 8 words>",
    "<hint 2 - a short teaser clue, under 8 words>",
    "<hint 3 - a short teaser clue, under 8 words>"
  ],
  "exp": [
    {
      "title": "<short catchy heading for the main fact, under 10 words>",
      "sub_title": "<one supporting line, under 14 words>",
      "content": "<at most 2 short sentences, with **bold** around the key names/numbers/facts>"
    },
    {
      "title": "<short catchy heading, under 10 words>",
      "sub_title": "<one supporting line, under 14 words>",
      "content": "<at most 2 short sentences, with **bold** around key facts>"
    }
  ]
}

Rules:
- Generate exactly 2 or 3 "exp" entries: 2 if the article has limited distinct facts, 3 only if there are genuinely separate fact clusters (e.g. multiple named winners/teams, or a rich medal tally) worth their own card.
- The LAST "exp" entry must always be a "Static GK" tie-in: its "title" must start with "Static GK – " and its "content" must connect the article to one clear, verifiable static fact (a capital city, an established historical date, a well-known record) — never invent unverifiable recent statistics.
- Use the "past 6 months" context only for general thematic framing (e.g. "building on India's recent strong showing in archery"); never invent specific unverifiable recent numbers or dates beyond what's given in the source article.
- Hints must be short, factual teaser clues — not answers.
- Each "content" must be at most 2 short sentences. No long paragraphs.
- Return ONLY the JSON object, nothing else.`
}
