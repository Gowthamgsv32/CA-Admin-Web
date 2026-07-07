// One prompt builder per content type. Each is called as (topic, day).
// Only "spoken" and "grammer" are filled in so far — add word/phrase here
// as they're written.
export const PROMPTS = {
  spoken: (topic) => `You are an expert English language coach specializing in spoken English tips for everyday learners.

Always respond ONLY with a valid JSON object. No markdown, no explanation, no backticks. Just raw JSON.

Generate a Daily Spoken English tip card for the following topic: "${topic}"

Return a JSON object with exactly these fields:
{
  "total": 365,
  "category": "<relevant category>",
  "title": "<title starting with an action verb>",
  "phrase": "<the main English phrase>",
  "tip": "<1-2 sentence explanation>",
  "examples": ["<example 1>", "<example 2>", "<example 3>", "<example 4>"],
  "pro_tip": "<advanced usage advice>",
  "goal": "<practical daily challenge>"
}

Return ONLY the JSON object, nothing else.`,

  grammer: (topic, day) => `You are an expert English grammar coach who creates clear, practical, and engaging daily grammar lessons for learners at all levels.

Always respond ONLY with a valid JSON object. No markdown, no explanation, no backticks. Just raw JSON.

Generate a Daily Grammar Bytes card for the following topic: "${topic}"

Return a JSON object with exactly these fields:

{
  "day": ${day},
  "title": "<clear grammar topic title>",
  "subtitle": "<one-line description of what the learner will gain>",
  "level": "<one of: Beginner | Elementary | Intermediate | Upper-Intermediate | Advanced | Strategic Mastery>",
  "concept": "<2-3 sentence explanation of the grammar concept in simple, friendly language>",
  "golden_rule_intro": "<one short line introducing the examples, e.g. 'Use past perfect to show sequence:'>",
  "correct_examples": [
    "<correct example sentence 1 starting with ✅>",
    "<correct example sentence 2 starting with ✅>",
    "<correct example sentence 3 starting with ✅>",
    "<correct example sentence 4 starting with ✅>"
  ],
  "key_principles": [
    "<short principle sentence 1>",
    "<short principle sentence 2>",
    "<short principle sentence 3>"
  ],
  "tip_main": "<one powerful insight about this grammar rule>",
  "tip_checklist": [
    "<checklist item 1>",
    "<checklist item 2>",
    "<checklist item 3>"
  ],
  "footer": "<short motivational closing line with 1-2 relevant emojis at the end>"
}

Rules:
- correct_examples must be natural, realistic English sentences relevant to the topic
- key_principles must be short punchy sentences (max 8 words each)
- tip_checklist items must start with a action verb (e.g. 'Identify', 'Check', 'Avoid')
- level must reflect the complexity of the topic
- Return ONLY the JSON object, nothing else`,

  word: null,
  phrase: null,
}
