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

// Fetches the plain CSV export by gid (not the gviz/tq name-based endpoint —
// gviz applies its own value-formatting heuristics to cells it detects as
// dates, which was silently mangling some rows; /export?format=csv returns
// the literal cell text as typed).
export function buildSheetCsvUrl(sheetId, gid) {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`
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

// Accepts 1-2 digit day/month and "-", "/", or "." as the separator — Google
// Sheets silently drops leading zeros (and may swap in "/") when it
// auto-detects a hand-typed date and reformats the cell.
const DATE_PATTERN = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/

// Normalizes a loosely-formatted dd-mm-yyyy date back to a strict
// zero-padded "dd-mm-yyyy", or returns null if it doesn't look like a date
// at all. The id formula needs a fixed 8-digit date to stay unique, so
// padding isn't optional even though the value is already human-readable.
function normalizeDate(raw) {
  const match = DATE_PATTERN.exec(raw.trim())
  if (!match) return null
  const [, day, month, year] = match
  return `${day.padStart(2, '0')}-${month.padStart(2, '0')}-${year}`
}

// Returns { cas, questions: [], skipped, skippedSamples } — skipped counts
// rows dropped for having a missing/malformed date (so they can't be turned
// into a valid id); skippedSamples holds a few { serial, title, rawDate }
// entries (capped at 10) identifying the problem row by its actual column A
// value (not a computed sheet row number — that requires knowing exactly how
// many header/title rows precede the data, which is easy to get off by one,
// and column A is what's directly visible and searchable in the sheet anyway).
export function parseCaSheet(csvText, { version, hasHeader = true }) {
  const rows = parseCsv(csvText)
  const dataRows = hasHeader ? rows.slice(1) : rows

  const cas = []
  let skipped = 0
  const skippedSamples = []

  dataRows.forEach((row) => {
    const rawDate = row[1] || ''
    const titleEn = (row[2] || '').trim()

    // An unused template row — no title and no date — isn't a data problem to
    // report, just an empty row below the real entries (common when a serial
    // number column is auto-filled/formula-dragged further down than the
    // actual data, which defeats a naive "every cell is empty" blank check).
    if (!titleEn && !rawDate.trim()) return

    const normalizedDate = normalizeDate(rawDate)
    if (!normalizedDate) {
      skipped++
      if (skippedSamples.length < 10) {
        skippedSamples.push({
          serial: (row[0] || '').trim() || '(blank)',
          title: titleEn || '(no title)',
          rawDate: rawDate.trim() || '(empty)',
        })
      }
      return
    }

    const normalizedRow = [...row]
    normalizedRow[1] = normalizedDate
    cas.push(parseCaRow(normalizedRow, version))
  })

  return { cas, questions: [], skipped, skippedSamples }
}
