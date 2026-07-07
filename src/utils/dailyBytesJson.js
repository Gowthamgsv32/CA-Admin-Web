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
