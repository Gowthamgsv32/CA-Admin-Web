// Builds the combined "day bytes" JSON (grammar + spoken + phrase + word)
// uploaded as Daily_Bytes/{dd-mm-yyyy}.json — distinct from the CAParser
// day json (cas/questions) in dailyBytesPublish.js.

const TYPE_BY_CONTENT_TYPE = {
  grammer: 3,
  spoken: 2,
  phrase: 1,
  word: 1,
}

const HINT_BY_CONTENT_TYPE = {
  grammer: 'Daily Grammar',
  spoken: 'Daily Spoken',
  phrase: 'Daily Phrase',
  word: 'Daily English',
}

export const BYTES_ORDER = ['grammer', 'spoken', 'phrase', 'word']

const LAST_DAY_STORAGE_KEY = 'dailyBytesLastDay'

export function baseIdFromDMY(dateDMY) {
  const digits = dateDMY.replace(/-/g, '')
  return digits.replace(/^0/, '')
}

export function extractBodyOnwards(html) {
  const idx = html.indexOf('<body')
  return idx === -1 ? html : html.slice(idx)
}

export function buildDayBytesJson({ dateDMY, ver, resultsByType }) {
  const base = baseIdFromDMY(dateDMY)

  const bytes = BYTES_ORDER.map((type, index) => ({
    id: Number(`${base}${index + 1}`),
    ver,
    date: dateDMY,
    type: TYPE_BY_CONTENT_TYPE[type],
    content_type: 0,
    category: '',
    is_lg: false,
    con: [
      {
        key: 'English',
        title: '',
        html: extractBodyOnwards(resultsByType[type].html),
        hint: HINT_BY_CONTENT_TYPE[type],
      },
    ],
  }))

  return { bytes }
}

// Merges a day's 4 bytes objects into the month's existing bytes, taking the
// union of the server's copy and whatever's already known locally (from an
// earlier "Convert JSON" this session that hasn't been published yet) —
// deduped by id, new day entries winning any collision — so a day converted
// but not yet published doesn't silently disappear the next time a
// different day is converted and re-fetches the month fresh from the
// server. Every object across the whole month shares one version number
// (`ver`, computed by the caller from root.json's own per-month version —
// see nextMonthVerStamp), so every entry gets re-stamped to it.
export function mergeBytesMonthJson({ serverMonthJson, localMonthJson, dayBytes, ver }) {
  const byId = new Map()
  for (const entry of serverMonthJson?.bytes || []) byId.set(entry.id, entry)
  for (const entry of localMonthJson?.bytes || []) byId.set(entry.id, entry)
  for (const entry of dayBytes) byId.set(entry.id, entry)

  const bytes = [...byId.values()].sort((a, b) => a.id - b.id).map((entry) => ({ ...entry, ver }))
  return { bytes }
}

// Remembers the last day number a "Convert JSON" completed for, so the
// form can prefill the next day (last + 1) on load instead of making the
// user recall and type it themselves each time.
export function loadLastDayNumber() {
  try {
    const raw = localStorage.getItem(LAST_DAY_STORAGE_KEY)
    const num = Number(raw)
    return Number.isFinite(num) && num > 0 ? num : null
  } catch {
    return null
  }
}

export function saveLastDayNumber(day) {
  try {
    localStorage.setItem(LAST_DAY_STORAGE_KEY, String(day))
  } catch {
    // localStorage unavailable — non-critical, skip persisting.
  }
}
