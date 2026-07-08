// Recall-Game/used-articles.json is a small server-side registry of which
// source Current Affairs article ids have already been turned into recall
// game questions and published. It has no bearing on the game itself — it
// only exists so the admin UI can show "already done" across days/devices,
// since the published topic JSON has no field linking back to the source
// article.
export function mergeUsedArticleIds(currentUsedJson, newIds) {
  const existing = new Set(currentUsedJson?.ids || [])
  for (const id of newIds) existing.add(id)
  return { ids: [...existing].sort((a, b) => a - b) }
}
