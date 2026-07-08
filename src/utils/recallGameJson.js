import { baseIdFromDMY } from './dailyBytesJson'

const VERSION_STORAGE_KEY = 'recallGameJsonVersion'

// 3 exp cards cover more distinct facts than 2, so give the player a bit
// longer to read/answer.
function timeForExpCount(count) {
  return count >= 3 ? 90 : 60
}

// Wraps N raw Gemini results (one per selected article, in selection order)
// into the final { topics: [...] } shape. `ver` is shared across the whole
// batch, matching the sample data (every topic in one publish carries the
// same version number).
export function buildTopicsJson({ dateDMY, ver, generatedList }) {
  const base = baseIdFromDMY(dateDMY)

  const topics = generatedList.map((gen, index) => ({
    id: Number(`${base}${index + 1}`),
    ver,
    date: dateDMY,
    is_lg: false,
    con: [
      {
        key: 'English',
        question: gen.question,
        time: timeForExpCount((gen.exp || []).length),
        hint: gen.hint || [],
        exp: (gen.exp || []).map((e) => ({
          ic_type: 0,
          title: e.title,
          sub_title: e.sub_title,
          content: e.content,
        })),
      },
    ],
  }))

  return { topics }
}

export function loadStoredRecallVersion() {
  try {
    const raw = localStorage.getItem(VERSION_STORAGE_KEY)
    const num = Number(raw)
    return Number.isFinite(num) ? num : 0
  } catch {
    return 0
  }
}

export function saveStoredRecallVersion(ver) {
  try {
    localStorage.setItem(VERSION_STORAGE_KEY, String(ver))
  } catch {
    // localStorage unavailable — non-critical, skip persisting.
  }
}
