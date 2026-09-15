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

// Merges a batch's topics into the month's existing topics, taking the
// union of the server's copy and whatever's already known locally (from an
// earlier "Generate Recall Game JSON" this session that hasn't been
// published yet) — deduped by id, new batch entries winning any collision —
// so a batch generated but not yet published doesn't silently disappear the
// next time a different batch is generated and re-fetches the month fresh
// from the server. Every object across the whole month shares one version
// number (`ver`, computed by the caller from recall-root.json's own
// per-month version), so every entry gets re-stamped to it.
export function mergeTopicsMonthJson({ serverMonthJson, localMonthJson, dayTopics, ver }) {
  const byId = new Map()
  for (const entry of serverMonthJson?.topics || []) byId.set(entry.id, entry)
  for (const entry of localMonthJson?.topics || []) byId.set(entry.id, entry)
  for (const entry of dayTopics) byId.set(entry.id, entry)

  const topics = [...byId.values()].sort((a, b) => a.id - b.id).map((entry) => ({ ...entry, ver }))
  return { topics }
}
