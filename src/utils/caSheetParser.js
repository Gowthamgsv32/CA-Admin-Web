// Fetches one tab of the Current Affairs content Google Sheet and parses it
// into the { cas: [...], questions: [] } shape — a direct port of the
// previous Kotlin desktop script that did the same thing from a hand-exported
// TSV file. Column layout (0-indexed, matching the Kotlin splittedList
// indices):
//   0  id suffix (per-day serial number)
//   1  date (dd-mm-yyyy)
//   2  title_en       3  desc_en       4  shorts_en      5  category
//   6  tags (unused — the Kotlin script computed but never wrote this field)
//   7  title_hi       8  desc_hi       9  shorts_hi
//   10 title_ta       11 desc_ta
// id = Number(date-with-dashes-removed + idSuffix), matching
// `splittedList[1].replace("-", "") + splittedList[0]).toLong()`.

const VERSION_STORAGE_KEY = 'caSheetJsonVersion'

export function buildSheetCsvUrl(sheetId, tabName) {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tabName)}`
}

// Minimal RFC4180-style CSV parser: handles quoted fields containing commas,
// newlines, and escaped ("") double quotes, and CRLF/LF line endings — all of
// which Google's gviz CSV export can produce for multi-line description text.
export function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false
  let i = 0

  while (i < text.length) {
    const c = text[i]

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i += 2
          continue
        }
        inQuotes = false
        i++
        continue
      }
      field += c
      i++
      continue
    }

    if (c === '"') {
      inQuotes = true
      i++
      continue
    }
    if (c === ',') {
      row.push(field)
      field = ''
      i++
      continue
    }
    if (c === '\r') {
      i++
      continue
    }
    if (c === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
      i++
      continue
    }
    field += c
    i++
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  return rows
}

export function parseCaRow(fields, version) {
  const idSuffix = (fields[0] || '').trim()
  const date = (fields[1] || '').trim()

  return {
    id: Number(date.replace(/-/g, '') + idSuffix),
    date,
    title_en: fields[2] || '',
    desc_en: fields[3] || '',
    shorts_en: fields[4] || '',
    category: fields[5] || '',
    title_hi: fields[7] || '',
    desc_hi: fields[8] || '',
    shorts_hi: fields[9] || '',
    title_ta: fields[10] || '',
    desc_ta: fields[11] || '',
    ver: version,
  }
}

const DATE_PATTERN = /^\d{2}-\d{2}-\d{4}$/

// Returns { cas, questions: [], skipped } — skipped counts rows dropped for
// having a missing/malformed date (so they can't be turned into a valid id).
export function parseCaSheet(csvText, { version, hasHeader = true }) {
  const rows = parseCsv(csvText)
  const dataRows = hasHeader ? rows.slice(1) : rows

  const cas = []
  let skipped = 0

  for (const row of dataRows) {
    if (row.every((cell) => cell.trim() === '')) continue // fully blank row

    const date = (row[1] || '').trim()
    if (!DATE_PATTERN.test(date)) {
      skipped++
      continue
    }
    cas.push(parseCaRow(row, version))
  }

  return { cas, questions: [], skipped }
}

export function loadStoredCaVersion() {
  try {
    const raw = localStorage.getItem(VERSION_STORAGE_KEY)
    const num = Number(raw)
    return Number.isFinite(num) ? num : 0
  } catch {
    return 0
  }
}
