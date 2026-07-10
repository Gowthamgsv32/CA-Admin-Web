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

// Packages the month json into a single-entry zip — the format both the
// "Download All" bundle and the Spaces upload use for `{monthKey}.zip`,
// matching root.json av_mos[i].zip_url.
export function buildMonthZipBytes(monthJson, monthKey) {
  return createZip([{ name: `${monthKey}.json`, data: new TextEncoder().encode(JSON.stringify(monthJson)) }])
}
