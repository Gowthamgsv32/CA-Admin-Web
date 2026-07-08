import { monthKeyFromDMY, monthNameFromDMY } from './dailyBytesPublish'

// Recall Game's root.json mirrors Daily Bytes' root shape but with its own
// field names (`url`, not `bytes_url`; no per-entry `url` in av_mos; desc
// reads "N Questions available") plus a handful of static passthrough
// fields (root/ext1-6/questions) that must survive untouched via the
// `...currentRoot` spread.
export function buildNextRecallRoot({ currentRoot, selectedDateDMY, questionCount, baseUrl }) {
  const monthKey = monthKeyFromDMY(selectedDateDMY)

  const nextRoot = {
    ...currentRoot,
    date: selectedDateDMY,
    ver: String(Number(currentRoot.ver) + 1),
    url: `${baseUrl}/${selectedDateDMY}.json`,
  }

  const avMos = [...(currentRoot.av_mos || [])]
  const existingIndex = avMos.findIndex((m) => m.month === monthKey)

  if (existingIndex !== -1) {
    const existing = avMos[existingIndex]
    const existingCount = parseInt(existing.desc, 10) || 0
    avMos[existingIndex] = {
      ...existing,
      desc: `${existingCount + questionCount} Questions available`,
      ver: String(Number(existing.ver) + 1),
    }
    nextRoot.av_mos = avMos
    return { root: nextRoot, monthEntryIndex: existingIndex, isNewMonth: false }
  }

  const newEntry = {
    title: `${monthNameFromDMY(selectedDateDMY)} Daily Bytes`,
    desc: `${questionCount} Questions available`,
    zip_url: `${baseUrl}/${monthKey}.zip`,
    status: false,
    month: monthKey,
    ver: '1',
  }
  avMos.unshift(newEntry)
  nextRoot.av_mos = avMos

  return { root: nextRoot, monthEntryIndex: 0, isNewMonth: true }
}

// Merges a batch's topics into the month's existing topics array. Every
// object across the whole month shares one version number, so every
// existing entry gets bumped +1000 right alongside the newly appended
// batch's topics, which are re-stamped to that same new version — same
// scheme as Daily Bytes' mergeBytesMonthJson.
export function mergeTopicsMonthJson({ currentMonthJson, dayTopics, fallbackVer }) {
  const existing = currentMonthJson?.topics || []

  if (existing.length === 0) {
    const restamped = dayTopics.map((entry) => ({ ...entry, ver: fallbackVer }))
    return { topics: restamped, ver: fallbackVer }
  }

  const existingVer = Number(existing[existing.length - 1].ver)
  const newVer = existingVer + 1000

  const bumped = existing.map((entry) => ({ ...entry, ver: newVer }))
  const restamped = dayTopics.map((entry) => ({ ...entry, ver: newVer }))

  return { topics: [...bumped, ...restamped], ver: newVer }
}
