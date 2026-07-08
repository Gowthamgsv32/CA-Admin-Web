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

const VERSION_STORAGE_KEY = 'dailyBytesJsonVersion'
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

// Merges a day's 4 bytes objects into the month's existing bytes array.
// Every object across the whole month shares one version number, so every
// existing entry gets bumped +1000 right alongside the newly appended day
// entries, which are re-stamped to the same new version (their provisional
// version from buildDayBytesJson is discarded in favor of this authoritative
// one, since the month file fetched from the server is the source of truth,
// not whatever the browser's local counter happened to guess).
export function mergeBytesMonthJson({ currentMonthJson, dayBytes, fallbackVer }) {
  const existing = currentMonthJson?.bytes || []

  if (existing.length === 0) {
    const restampedDay = dayBytes.map((entry) => ({ ...entry, ver: fallbackVer }))
    return { bytes: restampedDay, ver: fallbackVer }
  }

  const existingVer = Number(existing[existing.length - 1].ver)
  const newVer = existingVer + 1000

  const bumped = existing.map((entry) => ({ ...entry, ver: newVer }))
  const restampedDay = dayBytes.map((entry) => ({ ...entry, ver: newVer }))

  return { bytes: [...bumped, ...restampedDay], ver: newVer }
}

export function loadStoredVersion() {
  try {
    const raw = localStorage.getItem(VERSION_STORAGE_KEY)
    const num = Number(raw)
    return Number.isFinite(num) ? num : 0
  } catch {
    return 0
  }
}

export function saveStoredVersion(ver) {
  try {
    localStorage.setItem(VERSION_STORAGE_KEY, String(ver))
  } catch {
    // localStorage unavailable — non-critical, skip persisting.
  }
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
