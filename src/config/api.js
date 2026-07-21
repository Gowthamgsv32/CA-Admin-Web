export const WORKER_URL = import.meta.env.VITE_WORKER_URL || 'http://localhost:8787'

export const TOPICS_URL =
  'https://healthappobjects.ams3.cdn.digitaloceanspaces.com/Daily_Bytes/utild/topics.json'

export const DAILY_BYTES_BASE = 'https://healthappobjects.ams3.cdn.digitaloceanspaces.com/Daily_Bytes'

export const ROOT_URL = `${DAILY_BYTES_BASE}/daily-bytes-root.json`

export const VER_FILE_URL = `${DAILY_BYTES_BASE}/daily-bytes-ver.json`

export const CURRENT_AFFAIRS_BASE = 'https://healthappobjects.ams3.cdn.digitaloceanspaces.com/CurrentAffairs'

export const CA_ROOT_URL = `${CURRENT_AFFAIRS_BASE}/root.json`

export const RECALL_GAME_BASE = 'https://healthappobjects.ams3.cdn.digitaloceanspaces.com/Recall-Game'

export const RECALL_GAME_ROOT_URL = `${RECALL_GAME_BASE}/recall-root.json`

export const RECALL_GAME_USED_ARTICLES_URL = `${RECALL_GAME_BASE}/used-articles.json`

export const CA_GAME_BASE = 'https://healthappobjects.ams3.cdn.digitaloceanspaces.com/Cagame'

export const CA_GAME_ROOT_URL = `${CA_GAME_BASE}/root.json`

// A second, independent root/index file also served from Cagame/ — used by
// the quiz-game consumer of the CA QB Parser's question bank. Distinct from
// CA_GAME_ROOT_URL's root.json (av_mos schema): gameRoot.json uses its own
// "downloads" schema and is versioned separately.
export const CA_GAME_QB_ROOT_URL = `${CA_GAME_BASE}/gameRoot.json`

// Current Affairs content sheet — one tab per month (e.g. "July"), maintained
// by hand. Must be shared as "Anyone with the link can view" for the gviz
// CSV export below to work.
export const CA_SHEET_ID = '1iS73I4l7HMvMVQ_0Sh4YKj9KpJSrHKqVAXbSaG0EzXY'
