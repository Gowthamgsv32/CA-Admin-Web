// Shared helpers for the 4 "Month Repair" screens (CA Parser, Daily Bytes,
// Recall Game, CA QB) — each lets the admin pick a month, see which days are
// present in that month's already-published JSON via a calendar, fetch any
// missing day straight from its own day file, then regenerate and republish
// just the month file + the one av_mos/downloads entry for that month.

export function pad2(n) {
  return String(n).padStart(2, '0')
}

export function daysInMonth(month, year) {
  return new Date(year, month, 0).getDate()
}

export function firstWeekdayOfMonth(month, year) {
  return new Date(year, month - 1, 1).getDay() // 0 = Sunday
}

export function dmyForDay(day, month, year) {
  return `${pad2(day)}-${pad2(month)}-${year}`
}

export function monthKeyFor(month, year) {
  return `${pad2(month)}-${year}`
}

// Generic av_mos/downloads-style month-entry patch, shared by every Month
// Repair screen: updates (or creates) just the one entry for this month,
// leaving every other root.json field — including the top-level ver/date,
// which represent the most recently *published* day — completely
// untouched. This tool repairs an existing month's data completeness, it
// doesn't advance "latest published day" state the way a normal publish
// does, so it shouldn't touch anything beyond that one entry.
export function patchMonthEntry(root, { arrayKey, monthKey, desc, ver, buildNewEntry }) {
  const arr = [...(root[arrayKey] || [])]
  const idx = arr.findIndex((m) => m.month === monthKey)
  if (idx !== -1) {
    const next = [...arr]
    next[idx] = { ...next[idx], desc, ver }
    return { root: { ...root, [arrayKey]: next }, index: idx, isNew: false }
  }
  const next = [{ ...buildNewEntry(), desc, ver }, ...arr]
  return { root: { ...root, [arrayKey]: next }, index: 0, isNew: true }
}
