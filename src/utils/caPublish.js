// Updates the Current Affairs root.json for a new day's publish. Distinct
// from dailyBytesPublish.js's buildNextRoot: CA's root uses a "ca_url" field
// (not "bytes_url") and its av_mos desc carries two counts — cas and
// questions — rather than a single "N Daily Bytes" count.
import { dayOfMonthFromDMY, monthKeyFromDMY, monthNameFromDMY } from './dailyBytesPublish.js'
import { createZip } from './zip.js'

// Returns { root, monthEntryIndex, isNewMonth } — `root` is the full next
// root.json (av_mos patched in place) for the given day's cas/questions
// counts across the whole month.
export function buildNextCaRoot({ currentRoot, selectedDateDMY, monthCasCount, monthQuestionsCount, baseUrl }) {
  const monthKey = monthKeyFromDMY(selectedDateDMY)
  const isFirstOfMonth = dayOfMonthFromDMY(selectedDateDMY) === 1
  const desc = `${monthCasCount} Current Affairs, ${monthQuestionsCount} Questions`

  const nextRoot = {
    ...currentRoot,
    date: selectedDateDMY,
    ver: String(Number(currentRoot.ver) + 1),
    ca_url: `${baseUrl}/${selectedDateDMY}.json`,
  }

  const avMos = [...(currentRoot.av_mos || [])]
  const existingIndex = avMos.findIndex((m) => m.month === monthKey)

  if (existingIndex !== -1) {
    const existing = avMos[existingIndex]
    avMos[existingIndex] = {
      ...existing,
      desc,
      ver: String(Number(existing.ver) + 1),
    }
    nextRoot.av_mos = avMos
    return { root: nextRoot, monthEntryIndex: existingIndex, isNewMonth: false }
  }

  const newEntry = {
    title: `${monthNameFromDMY(selectedDateDMY)} Current Affairs`,
    desc,
    url: `${baseUrl}/${monthKey}.json`,
    zip_url: `${baseUrl}/${monthKey}.zip`,
    status: false,
    month: monthKey,
    ver: '1',
  }
  avMos.unshift(newEntry)
  nextRoot.av_mos = avMos

  if (!isFirstOfMonth) {
    console.warn(`No existing av_mos entry for ${monthKey}; creating one even though date is not day 1.`)
  }

  return { root: nextRoot, monthEntryIndex: 0, isNewMonth: true }
}

// Cagame maintains its own independent root.json/month history at a
// separate base path, and only ever uploads zipped day/month files (no raw
// .json) — so unlike CurrentAffairs, its ca_url and av_mos[].url must point
// at the .zip variants.
export function buildNextCaGameRoot({ currentRoot, selectedDateDMY, monthCasCount, monthQuestionsCount, baseUrl }) {
  const result = buildNextCaRoot({ currentRoot, selectedDateDMY, monthCasCount, monthQuestionsCount, baseUrl })
  const root = { ...result.root, ca_url: `${baseUrl}/${selectedDateDMY}.zip` }
  const avMos = [...root.av_mos]
  const entry = avMos[result.monthEntryIndex]
  avMos[result.monthEntryIndex] = { ...entry, url: entry.zip_url }
  root.av_mos = avMos
  return { ...result, root }
}

// gameRoot.json is a second, independent root/index also served from
// Cagame/ — schema is unrelated to root.json's (own top-level "date"/"ver",
// "last_updated_game_url" instead of "ca_url", and a "downloads" array
// instead of "av_mos", each entry carrying a single "N questions" desc
// rather than CurrentAffairs's combined cas+questions count).
export function buildNextGameRoot({ currentGameRoot, selectedDateDMY, monthQuestionsCount, baseUrl }) {
  const monthKey = monthKeyFromDMY(selectedDateDMY)
  const desc = `${monthQuestionsCount} questions`

  const nextRoot = {
    ...currentGameRoot,
    date: selectedDateDMY,
    ver: String(Number(currentGameRoot.ver) + 1),
    last_updated_game_url: `${baseUrl}/${selectedDateDMY}.zip`,
  }

  const downloads = [...(currentGameRoot.downloads || [])]
  const existingIndex = downloads.findIndex((d) => d.month === monthKey)

  if (existingIndex !== -1) {
    const existing = downloads[existingIndex]
    downloads[existingIndex] = {
      ...existing,
      desc,
      ver: String(Number(existing.ver) + 1),
    }
    nextRoot.downloads = downloads
    return { root: nextRoot, monthEntryIndex: existingIndex, isNewMonth: false }
  }

  const newEntry = {
    title: `${monthNameFromDMY(selectedDateDMY)} Monthly Game`,
    desc,
    zip_url: `${baseUrl}/${monthKey}.zip`,
    status: false,
    month: monthKey,
    ver: '1',
    type: 'MONTHLY',
  }
  downloads.unshift(newEntry)
  nextRoot.downloads = downloads

  return { root: nextRoot, monthEntryIndex: 0, isNewMonth: true }
}

// Packages the month json into a single-entry zip — the format both the
// "Download All" bundle and the Spaces upload use for `{monthKey}.zip`,
// matching root.json av_mos[i].zip_url.
export function buildMonthZipBytes(monthJson, monthKey) {
  return createZip([{ name: `${monthKey}.json`, data: new TextEncoder().encode(JSON.stringify(monthJson)) }])
}
