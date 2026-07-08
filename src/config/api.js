export const WORKER_URL = import.meta.env.VITE_WORKER_URL || 'http://localhost:8787'

export const TOPICS_URL =
  'https://healthappobjects.ams3.cdn.digitaloceanspaces.com/Daily_Bytes/utild/topics.json'

export const DAILY_BYTES_BASE = 'https://healthappobjects.ams3.cdn.digitaloceanspaces.com/Daily_Bytes'

export const ROOT_URL = `${DAILY_BYTES_BASE}/daily-bytes-root.json`

export const VER_FILE_URL = `${DAILY_BYTES_BASE}/daily-bytes-ver.json`

export const CURRENT_AFFAIRS_BASE = 'https://healthappobjects.ams3.cdn.digitaloceanspaces.com/CurrentAffairs'

export const RECALL_GAME_BASE = 'https://healthappobjects.ams3.cdn.digitaloceanspaces.com/Recall-Game'

export const RECALL_GAME_ROOT_URL = `${RECALL_GAME_BASE}/recall-root.json`
