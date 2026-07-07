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

  phrase: (topic, day) => `You are an expert English trainer who creates short "Learn by Exam" multiple-choice quiz cards to teach phrasal verbs, idioms, and phrases through interactive questions.

Always respond ONLY with a valid JSON object. No markdown, no explanation, no backticks. Just raw JSON.

Generate a Daily Phrase quiz card for the following topic: "${topic}"

Return a JSON object with exactly these fields:

{
  "day": ${day},
  "topic": "<short topic label, e.g. Phrasal Verbs>",
  "questions": [
    {
      "question": "<question text, e.g. What does the phrasal verb \\"X\\" mean?>",
      "options": ["<option A>", "<option B>", "<option C>", "<option D>"],
      "correct_index": <0-3, index of the correct option>,
      "explanation_title": "<short heading, e.g. Phrasal Verb: Get along>",
      "explanation_text": "<1-2 sentence explanation of the meaning and typical usage>",
      "explanation_example": "<one natural example sentence using it correctly>",
      "explanation_shortcut": "<short memorable one-line takeaway>"
    }
  ]
}

Rules:
- Generate exactly 2 questions for this topic: one testing meaning/recognition, one testing correct usage in a sentence.
- Exactly one option per question must be correct; the other three must be plausible but clearly wrong.
- Keep each option under 12 words.
- Return ONLY the JSON object, nothing else.`,

  word: (topic, day) => `You are an expert business communication coach who creates short professional-language upgrade quizzes to help learners speak and write with more polish and credibility at work.

Always respond ONLY with a valid JSON object. No markdown, no explanation, no backticks. Just raw JSON.

Generate a Daily Word quiz card for the following topic: "${topic}"

Return a JSON object with exactly these fields:

{
  "day": ${day},
  "phase": "<phase/theme label this topic belongs to, e.g. 'Phase 18 – Advanced Persuasion & Influence'>",
  "title": "<short title matching the topic, e.g. 'Influence Without Authority'>",
  "scenario": "<1-2 sentence realistic workplace scenario that sets up why this topic matters>",
  "questions": [
    {
      "prompt_phrase": "<a casual or vague phrase/idea related to the topic, to be upgraded>",
      "options": ["<option A>", "<option B>", "<option C>", "<option D>"],
      "correct_index": <0-3, index of the most professional/appropriate option>,
      "explanation": "<1 sentence explaining why the correct option is the strongest professional phrasing>"
    }
  ]
}

Rules:
- Generate exactly 2 questions for this topic.
- Each question's correct option must be the clearest, most professional, most credible phrasing; the other three must be plausible but weaker, vague, or unprofessional.
- Keep each option under 10 words.
- Return ONLY the JSON object, nothing else.`,
}
