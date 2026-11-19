// CA Translate: fills in missing Tamil/Hindi/Malayalam title+desc cells in
// the CA content sheet by translating the English columns with Google
// Cloud Translation, then writing the results straight back into the sheet
// via the Sheets API — the admin's manual translation workflow, automated.
//
// Column layout (0-indexed) matches caSheetParser.js's existing layout for
// this same sheet, plus two new columns (M/N) for the newly-added Malayalam
// translation, appended after the existing Tamil columns so none of the
// existing column indices shift:
//   1 date   2 title_en   3 desc_en
//   7 title_hi   8 desc_hi
//   10 title_ta  11 desc_ta
//   12 title_ml  13 desc_ml   (new)
import { getGoogleAccessToken } from './googleServiceAccount.js'

const COLS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N']
const COL = { date: 1, titleEn: 2, descEn: 3, titleHi: 7, descHi: 8, titleTa: 10, descTa: 11, titleMl: 12, descMl: 13 }
const TARGET_LANGS = [
  { lang: 'hi', titleCol: COL.titleHi, descCol: COL.descHi },
  { lang: 'ta', titleCol: COL.titleTa, descCol: COL.descTa },
  { lang: 'ml', titleCol: COL.titleMl, descCol: COL.descMl },
]

// Same lenient dd-mm-yyyy matching as caSheetParser.js's normalizeDate —
// duplicated here since worker code doesn't share imports with src/utils.
const DATE_PATTERN = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/
export function normalizeTranslateDate(raw) {
  const match = DATE_PATTERN.exec(String(raw || '').trim())
  if (!match) return null
  const [, day, month, year] = match
  return `${day.padStart(2, '0')}-${month.padStart(2, '0')}-${year}`
}

function escapeSheetName(tabName) {
  return tabName.replace(/'/g, "''")
}

// Pure planning step (no network): scans the sheet's raw row values and
// returns, per target language, which English title/desc cells are missing
// a translation and the exact A1 cell each one should fill. Exported
// separately from the network calls so it's unit-testable on its own.
export function buildTranslationPlan(rows, { mode, date }) {
  const dataRows = rows.slice(1) // row 0 is the header
  const targetDate = mode === 'day' ? normalizeTranslateDate(date) : null

  const queued = { hi: [], ta: [], ml: [] }
  let rowsInScope = 0

  dataRows.forEach((row, i) => {
    const sheetRow = i + 2 // +1 for the header row, +1 for 1-indexed sheet rows
    const titleEn = (row[COL.titleEn] || '').toString().trim()
    const descEn = (row[COL.descEn] || '').toString().trim()
    // An unused template row below the real data — not a day to translate.
    if (!titleEn && !descEn) return

    if (mode === 'day' && normalizeTranslateDate(row[COL.date]) !== targetDate) return

    rowsInScope++

    for (const { lang, titleCol, descCol } of TARGET_LANGS) {
      const existingTitle = (row[titleCol] || '').toString().trim()
      const existingDesc = (row[descCol] || '').toString().trim()
      if (titleEn && !existingTitle) queued[lang].push({ text: titleEn, cell: `${COLS[titleCol]}${sheetRow}` })
      if (descEn && !existingDesc) queued[lang].push({ text: descEn, cell: `${COLS[descCol]}${sheetRow}` })
    }
  })

  return { queued, rowsInScope }
}

async function fetchSheetValues(accessToken, sheetId, tabName) {
  const range = encodeURIComponent(`'${escapeSheetName(tabName)}'!A1:N5000`)
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const body = await res.json()
  if (!res.ok) throw new Error(body.error?.message || `Failed to read the sheet (${res.status})`)
  return body.values || []
}

// Google Translate v2 accepts a batch of `q` strings per call and returns
// translations in the same order — this keeps the whole run to at most one
// call per target language that actually has missing cells, regardless of
// how many rows are involved.
async function translateBatch(accessToken, texts, targetLang) {
  if (texts.length === 0) return []
  const CHUNK = 100
  const results = []
  for (let i = 0; i < texts.length; i += CHUNK) {
    const chunk = texts.slice(i, i + CHUNK)
    const res = await fetch('https://translation.googleapis.com/language/translate/v2', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: chunk, target: targetLang, source: 'en', format: 'text' }),
    })
    const body = await res.json()
    if (!res.ok) throw new Error(body.error?.message || `Translate API failed for "${targetLang}" (${res.status})`)
    results.push(...body.data.translations.map((t) => t.translatedText))
  }
  return results
}

async function writeTranslatedCells(accessToken, sheetId, tabName, updates) {
  if (updates.length === 0) return
  const sheetName = escapeSheetName(tabName)
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values:batchUpdate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      valueInputOption: 'RAW',
      data: updates.map((u) => ({ range: `'${sheetName}'!${u.cell}`, values: [[u.text]] })),
    }),
  })
  const body = await res.json()
  if (!res.ok) throw new Error(body.error?.message || `Failed to write translations back to the sheet (${res.status})`)
}

// Orchestrates the whole run: read the live sheet -> plan what's missing ->
// translate (one batched call per language that needs it) -> write back.
// Returns a summary for the UI; throws on any failure (network, auth, or
// Translate/Sheets API errors) so the caller can surface a clear error.
export async function runCaTranslate(env, { sheetId, tabName, mode, date }) {
  const accessToken = await getGoogleAccessToken(env)
  const rows = await fetchSheetValues(accessToken, sheetId, tabName)
  const { queued, rowsInScope } = buildTranslationPlan(rows, { mode, date })

  const byLanguage = {}
  const updates = []
  for (const lang of ['hi', 'ta', 'ml']) {
    const items = queued[lang]
    byLanguage[lang] = items.length
    if (items.length === 0) continue
    const translated = await translateBatch(accessToken, items.map((it) => it.text), lang)
    items.forEach((item, idx) => updates.push({ cell: item.cell, text: translated[idx] }))
  }

  await writeTranslatedCells(accessToken, sheetId, tabName, updates)

  return { rowsScanned: rowsInScope, cellsFilled: updates.length, byLanguage }
}
