// Gemini's CA QB output occasionally drifts from the schema in
// caQbPrompts.js — most commonly by nesting "options" (and sometimes
// "answer"/"explanation"/"tip") inside the "question" object instead of
// alongside it. This hoists known misplacements back into place, then
// strictly validates the result so a malformed batch is rejected with a
// clear error instead of silently shipping broken question cards to the UI.

const REQUIRED_LANGS = ['en', 'hi', 'ta']
const OPTION_LETTERS = ['A', 'B', 'C', 'D']
const VALID_TYPES = ['MCQ', 'STATEMENT', 'MATCH', 'FILL_BLANK']
const VALID_DIFFICULTIES = ['Easy', 'Medium', 'Hard']
const SIBLING_FIELDS = ['options', 'answer', 'explanation', 'tip', 'type', 'difficulty']

function isLangTextMap(value) {
  return (
    !!value &&
    typeof value === 'object' &&
    REQUIRED_LANGS.every((lang) => typeof value[lang] === 'string' && value[lang].trim().length > 0)
  )
}

function isOptionsMap(value) {
  return (
    !!value &&
    typeof value === 'object' &&
    REQUIRED_LANGS.every(
      (lang) =>
        value[lang] &&
        typeof value[lang] === 'object' &&
        OPTION_LETTERS.every((letter) => typeof value[lang][letter] === 'string' && value[lang][letter].trim().length > 0)
    )
  )
}

// Moves any of SIBLING_FIELDS back out to the top level if the model nested
// them inside "question" instead — the single most common drift observed.
function hoistMisplacedFields(question) {
  if (!question || typeof question !== 'object' || !question.question || typeof question.question !== 'object') {
    return question
  }
  const fixed = { ...question, question: { ...question.question } }
  for (const field of SIBLING_FIELDS) {
    if (fixed[field] === undefined && fixed.question[field] !== undefined) {
      fixed[field] = fixed.question[field]
      delete fixed.question[field]
    }
  }
  return fixed
}

function validateQuestion(question, position) {
  const errors = []
  const label = `Question ${position}`

  if (!question || typeof question !== 'object') {
    return [`${label}: not an object.`]
  }
  if (!VALID_TYPES.includes(question.type)) {
    errors.push(`${label}: "type" must be one of ${VALID_TYPES.join('/')} (got ${JSON.stringify(question.type)}).`)
  }
  if (!VALID_DIFFICULTIES.includes(question.difficulty)) {
    errors.push(`${label}: "difficulty" must be one of ${VALID_DIFFICULTIES.join('/')} (got ${JSON.stringify(question.difficulty)}).`)
  }
  if (!isLangTextMap(question.question)) {
    errors.push(`${label}: "question" must be an { en, hi, ta } object of non-empty strings.`)
  }
  if (!isOptionsMap(question.options)) {
    errors.push(`${label}: "options" must be an { en, hi, ta } object, each with non-empty A/B/C/D strings.`)
  }
  if (!OPTION_LETTERS.includes(question.answer)) {
    errors.push(`${label}: "answer" must be one of A/B/C/D (got ${JSON.stringify(question.answer)}).`)
  }
  if (!isLangTextMap(question.explanation)) {
    errors.push(`${label}: "explanation" must be an { en, hi, ta } object of non-empty strings.`)
  }
  if (!isLangTextMap(question.tip)) {
    errors.push(`${label}: "tip" must be an { en, hi, ta } object of non-empty strings.`)
  }

  return errors
}

// Returns { data, errors }. `data` has misplaced fields hoisted back into
// place; `errors` lists every remaining structural problem (empty when the
// whole batch is valid) so the caller can decide whether to accept or reject.
export function normalizeAndValidateCaQb(rawData) {
  const data = rawData.map(hoistMisplacedFields)
  const errors = data.flatMap((question, i) => validateQuestion(question, i + 1))
  return { data, errors }
}
