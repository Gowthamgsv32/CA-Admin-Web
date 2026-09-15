// Validates Gemini's recall-game response against the schema in
// recallGamePrompts.js before it's returned to the frontend. buildTopicsJson
// (recallGameJson.js) only reads specific fields off this object, so stray
// top-level keys can't leak into the published JSON on their own — but a
// wrong-shaped "hint" (not an array of strings) or "exp" entry (missing
// title/sub_title/content, or the wrong count) does get embedded as-is,
// which is what "unwanted key values" in the published recall game data
// actually turned out to be. Reject early with a clear error instead.

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function isStringArray(value) {
  return Array.isArray(value) && value.length > 0 && value.every((item) => isNonEmptyString(item))
}

export function validateRecallGameData(data) {
  const errors = []

  if (!data || typeof data !== 'object') {
    return ['Response is not an object.']
  }

  if (!isNonEmptyString(data.question)) {
    errors.push(`"question" must be a non-empty string (got ${JSON.stringify(data.question)}).`)
  }

  if (!isStringArray(data.hint)) {
    errors.push('"hint" must be a non-empty array of non-empty strings.')
  }

  if (!Array.isArray(data.exp) || data.exp.length < 2 || data.exp.length > 3) {
    errors.push(`"exp" must be an array of 2 or 3 entries (got ${Array.isArray(data.exp) ? data.exp.length : typeof data.exp}).`)
  } else {
    data.exp.forEach((entry, i) => {
      const label = `exp[${i}]`
      if (!entry || typeof entry !== 'object') {
        errors.push(`${label}: not an object.`)
        return
      }
      if (!isNonEmptyString(entry.title)) errors.push(`${label}: "title" must be a non-empty string.`)
      if (!isNonEmptyString(entry.sub_title)) errors.push(`${label}: "sub_title" must be a non-empty string.`)
      if (!isNonEmptyString(entry.content)) errors.push(`${label}: "content" must be a non-empty string.`)
    })

    const last = data.exp[data.exp.length - 1]
    if (last && isNonEmptyString(last.title) && !/static gk/i.test(last.title)) {
      errors.push(`Last exp entry's "title" must be the Static GK tie-in (got ${JSON.stringify(last.title)}).`)
    }
  }

  return errors
}
