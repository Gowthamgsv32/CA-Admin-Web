const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function isoToDMY(iso) {
  const [year, month, day] = iso.split('-')
  return `${day}-${month}-${year}`
}

export function monthKeyFromDMY(dmy) {
  const [, month, year] = dmy.split('-')
  return `${month}-${year}`
}

export function monthNameFromDMY(dmy) {
  const [, month] = dmy.split('-')
  return MONTH_NAMES[Number(month) - 1]
}

export function dayOfMonthFromDMY(dmy) {
  return Number(dmy.split('-')[0])
}

// Returns { root, monthEntryIndex, isNewMonth } where `root` is the full
// next daily-bytes-root.json (av_mos patched in place), and monthEntryIndex
// points at the entry that was created/updated so the UI can offer its
// `ver` field for editing.
export function buildNextRoot({ currentRoot, selectedDateDMY, casCount, baseUrl }) {
  const monthKey = monthKeyFromDMY(selectedDateDMY)
  const isFirstOfMonth = dayOfMonthFromDMY(selectedDateDMY) === 1

  const nextRoot = {
    ...currentRoot,
    date: selectedDateDMY,
    ver: String(Number(currentRoot.ver) + 1),
    bytes_url: `${baseUrl}/${selectedDateDMY}.json`,
  }

  const avMos = [...(currentRoot.av_mos || [])]
  const existingIndex = avMos.findIndex((m) => m.month === monthKey)

  if (existingIndex !== -1) {
    const existing = avMos[existingIndex]
    const existingCount = parseInt(existing.desc, 10) || 0
    avMos[existingIndex] = {
      ...existing,
      desc: `${existingCount + casCount} Daily Bytes`,
      ver: String(Number(existing.ver) + 1),
    }
    nextRoot.av_mos = avMos
    return { root: nextRoot, monthEntryIndex: existingIndex, isNewMonth: false }
  }

  const newEntry = {
    title: `${monthNameFromDMY(selectedDateDMY)} Daily Bytes`,
    desc: `${casCount} Daily Bytes`,
    url: `${baseUrl}/${monthKey}.json`,
    zip_url: `${baseUrl}/${monthKey}.zip`,
    status: false,
    month: monthKey,
    ver: '1',
  }
  avMos.unshift(newEntry)
  nextRoot.av_mos = avMos

  if (!isFirstOfMonth) {
    // No existing entry for this month even though it's not day 1 — this
    // is the first publish for the month, just starting later than day 1.
    console.warn(`No existing av_mos entry for ${monthKey}; creating one even though date is not day 1.`)
  }

  return { root: nextRoot, monthEntryIndex: 0, isNewMonth: true }
}

export function buildNextVerFile({ currentVerFile, selectedDateDMY }) {
  return {
    ...currentVerFile,
    ver: Number(currentVerFile.ver) + 1,
    date: selectedDateDMY,
  }
}

export function mergeMonthJson({ currentMonthJson, dayJson }) {
  const base = currentMonthJson || { cas: [], questions: [] }
  return {
    cas: [...(base.cas || []), ...(dayJson.cas || [])],
    questions: [...(base.questions || []), ...(dayJson.questions || [])],
  }
}
