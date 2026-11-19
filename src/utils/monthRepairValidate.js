// Shared validation for the Month Repair screens — surfaced as non-blocking
// warnings so the admin can see data problems (id collisions, malformed
// entries) before publishing. The merge itself still proceeds either way
// (the newest fetch always wins on a genuine id collision, same as before);
// this only makes that otherwise-silent overwrite visible.

// Detects two distinct problems when merging a freshly-fetched day's list
// into the month's existing list:
// 1. The fetched day's own data has a duplicate id in it (a source/sheet
//    error, not something the merge caused).
// 2. An id already exists in the month with genuinely different content —
//    the fetch is about to silently replace it.
// Harmless re-fetches (identical content under the same id) are not
// reported.
export function findIdConflicts(existingList, incomingList, idKey) {
  const conflicts = []

  const seenInIncoming = new Map()
  for (const item of incomingList) {
    const id = item[idKey]
    if (seenInIncoming.has(id)) {
      conflicts.push({
        id,
        type: 'duplicate-in-fetch',
        message: `"${id}" appears more than once in the fetched day's own data.`,
      })
    }
    seenInIncoming.set(id, item)
  }

  const existingById = new Map(existingList.map((item) => [item[idKey], item]))
  for (const item of incomingList) {
    const id = item[idKey]
    const existing = existingById.get(id)
    if (existing && JSON.stringify(existing) !== JSON.stringify(item)) {
      conflicts.push({
        id,
        type: 'content-mismatch',
        message: `"${id}" already exists in the month with different content — the fetched copy will replace it.`,
        existing,
        incoming: item,
      })
    }
  }

  return conflicts
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value)
}

function checkFields(entry, fields) {
  const errors = []
  for (const [field, check] of fields) {
    if (!check(entry?.[field])) errors.push(field)
  }
  return errors
}

export function validateCasEntry(entry) {
  return checkFields(entry, [
    ['id', isFiniteNumber],
    ['date', isNonEmptyString],
    ['title_en', isNonEmptyString],
    ['desc_en', isNonEmptyString],
  ])
}

export function validateCaQuestionEntry(entry) {
  return checkFields(entry, [['qid', isFiniteNumber]])
}

export function validateBytesEntry(entry) {
  return checkFields(entry, [
    ['id', isFiniteNumber],
    ['date', isNonEmptyString],
    ['ver', isFiniteNumber],
    ['con', (v) => Array.isArray(v) && v.length > 0],
  ])
}

export function validateTopicEntry(entry) {
  return checkFields(entry, [
    ['id', isFiniteNumber],
    ['date', isNonEmptyString],
    ['ver', isFiniteNumber],
    ['con', (v) => Array.isArray(v) && v.length > 0],
  ])
}

export function validateQbQuestionEntry(entry) {
  return checkFields(entry, [
    ['qid', (v) => typeof v === 'string' && /^\d+$/.test(v)],
    ['type', isNonEmptyString],
    ['question', (v) => v && typeof v === 'object'],
    ['options', (v) => v && typeof v === 'object'],
    ['answer', isNonEmptyString],
  ])
}

// Runs a per-entry validator over a list, returning only the entries with
// problems — each tagged with its id (falling back to its position) and
// which fields failed.
export function findFormatIssues(list, idKey, validateFn) {
  const issues = []
  list.forEach((entry, i) => {
    const fields = validateFn(entry)
    if (fields.length > 0) {
      issues.push({ id: entry?.[idKey] ?? `#${i}`, fields })
    }
  })
  return issues
}
