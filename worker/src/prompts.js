// One prompt builder per content type. Only "spoken" is filled in for now —
// add the others here as they're written.
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
  grammer: null,
  word: null,
  phrase: null,
}
