import { useEffect, useMemo, useState } from 'react'
import { CA_GAME_BASE, CA_GAME_QB_ROOT_URL, WORKER_URL } from '../config/api'
import { MONTH_NAMES } from '../utils/dailyBytesPublish'
import { dmyForDay, monthKeyFor, patchMonthEntry } from '../utils/monthRepair'
import { bytesToBase64, createZip, extractFirstFileFromZip } from '../utils/zip'
import MonthCalendarGrid from '../components/MonthCalendarGrid'

function buildYearOptions() {
  const current = new Date().getFullYear()
  const years = []
  for (let y = current - 2; y <= current + 1; y++) years.push(y)
  return years
}

const YEARS = buildYearOptions()

// A question's qid is "<8-digit ddmmyyyy date><running sequence>" (never a
// separate "date" field) — this is the only way to tell which day a
// question belongs to.
function dateDigitsFromQid(qid) {
  return String(qid).slice(0, 8)
}

function zipFileFromArray(monthKey, arr) {
  return createZip([{ name: `${monthKey}.json`, data: new TextEncoder().encode(JSON.stringify(arr)) }])
}

async function fetchAndExtractZip(url) {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) {
    const err = new Error(`Request failed (${res.status})`)
    err.status = res.status
    throw err
  }
  const buffer = new Uint8Array(await res.arrayBuffer())
  const jsonBytes = extractFirstFileFromZip(buffer)
  const parsed = JSON.parse(new TextDecoder().decode(jsonBytes))
  return Array.isArray(parsed) ? parsed : []
}

function CaQbMonthRepair() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())

  const [root, setRoot] = useState(null)
  const [rootLoading, setRootLoading] = useState(true)
  const [rootError, setRootError] = useState('')

  const [questions, setQuestions] = useState(null) // bare array
  const [monthLoading, setMonthLoading] = useState(false)
  const [monthError, setMonthError] = useState('')

  const [fetchingDay, setFetchingDay] = useState(null)
  const [dayErrors, setDayErrors] = useState({})

  const [versionOverride, setVersionOverride] = useState('')

  const [generated, setGenerated] = useState(null) // { rootText, monthText }
  const [generateError, setGenerateError] = useState('')

  const [publishing, setPublishing] = useState(false)
  const [publishResults, setPublishResults] = useState(null)
  const [publishError, setPublishError] = useState('')
  const [purgeStatus, setPurgeStatus] = useState(null)

  const monthKey = useMemo(() => monthKeyFor(month, year), [month, year])

  async function loadRoot() {
    setRootError('')
    setRootLoading(true)
    try {
      const res = await fetch(CA_GAME_QB_ROOT_URL, { cache: 'no-store' })
      if (!res.ok) throw new Error(`Failed to load gameRoot.json (${res.status})`)
      setRoot(await res.json())
    } catch (err) {
      setRootError(err.message)
    } finally {
      setRootLoading(false)
    }
  }

  useEffect(() => {
    loadRoot()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setMonthError('')
    setQuestions(null)
    setDayErrors({})
    setGenerated(null)
    setPublishResults(null)
    setMonthLoading(true)

    fetchAndExtractZip(`${CA_GAME_BASE}/${monthKey}.zip`)
      .then((arr) => setQuestions(arr))
      .catch((err) => {
        if (err.status === 404 || err.status === 403) setQuestions([])
        else setMonthError(err.message)
      })
      .finally(() => setMonthLoading(false))
  }, [monthKey])

  const existingEntry = useMemo(() => root?.downloads?.find((m) => m.month === monthKey), [root, monthKey])

  useEffect(() => {
    setVersionOverride(String((Number(existingEntry?.ver) || 0) + 1))
  }, [existingEntry])

  const dayInfo = useMemo(() => {
    const map = new Map()
    if (questions) {
      for (const q of questions) {
        const digits = dateDigitsFromQid(q.qid)
        const day = Number(digits.slice(0, 2))
        if (!day) continue
        const prev = map.get(day) || { present: true, count: 0 }
        prev.count += 1
        map.set(day, prev)
      }
    }
    for (const [day, message] of Object.entries(dayErrors)) {
      const d = Number(day)
      const prev = map.get(d) || { present: false }
      map.set(d, { ...prev, error: message })
    }
    for (const [d, info] of map) {
      if (info.present) map.set(d, { ...info, label: `${info.count} questions` })
    }
    return map
  }, [questions, dayErrors])

  async function handleFetchDay(day) {
    const dateDMY = dmyForDay(day, month, year)
    setFetchingDay(day)
    setDayErrors((prev) => {
      const next = { ...prev }
      delete next[day]
      return next
    })
    try {
      const dayQuestions = await fetchAndExtractZip(`${CA_GAME_BASE}/${dateDMY}.zip`)
      setQuestions((prev) => {
        const byQid = new Map((prev || []).map((q) => [q.qid, q]))
        for (const q of dayQuestions) byQid.set(q.qid, q)
        return [...byQid.values()]
      })
    } catch (err) {
      setDayErrors((prev) => ({ ...prev, [day]: `No day file found (${err.status || err.message})` }))
    } finally {
      setFetchingDay(null)
    }
  }

  function handleGenerate() {
    setGenerateError('')
    setGenerated(null)
    setPublishResults(null)

    if (!root || !questions) {
      setGenerateError('Load gameRoot.json and the month data first.')
      return
    }
    if (!versionOverride.trim()) {
      setGenerateError('Enter a version for this month.')
      return
    }

    const ver = versionOverride.trim()
    const desc = `${questions.length} questions`
    const { root: patchedRoot } = patchMonthEntry(root, {
      arrayKey: 'downloads',
      monthKey,
      desc,
      ver,
      buildNewEntry: () => ({
        title: `${MONTH_NAMES[month - 1]} Monthly Game`,
        desc,
        zip_url: `${CA_GAME_BASE}/${monthKey}.zip`,
        status: false,
        month: monthKey,
        type: 'MONTHLY',
      }),
    })

    setGenerated({
      rootText: JSON.stringify(patchedRoot, null, 2),
      monthText: JSON.stringify(questions, null, 2),
    })
  }

  async function handlePublish() {
    setPublishError('')
    setPublishResults(null)
    setPurgeStatus(null)

    let nextRoot
    let nextQuestions
    try {
      nextRoot = JSON.parse(generated.rootText)
      nextQuestions = JSON.parse(generated.monthText)
      if (!Array.isArray(nextQuestions)) throw new Error('Month JSON must be an array.')
    } catch (err) {
      setPublishError(`Invalid JSON: ${err.message}`)
      return
    }

    setPublishing(true)
    try {
      const monthZipBytes = zipFileFromArray(monthKey, nextQuestions)
      const files = [
        { key: 'Cagame/gameRoot.json', contentType: 'application/json', body: JSON.stringify(nextRoot) },
        {
          key: `Cagame/${monthKey}.zip`,
          contentType: 'application/zip',
          bodyBase64: bytesToBase64(monthZipBytes),
        },
      ]

      const res = await fetch(`${WORKER_URL}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files }),
      })
      const result = await res.json()
      setPublishResults(result.results)

      if (result.results?.every((r) => r.success)) {
        setRoot(nextRoot)
        setQuestions(nextQuestions)

        try {
          const purgeRes = await fetch(`${WORKER_URL}/purge-cdn`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ files: files.map((f) => f.key) }),
          })
          const purgeResult = await purgeRes.json()
          setPurgeStatus(
            purgeRes.ok && purgeResult.success
              ? { success: true }
              : { success: false, error: purgeResult.error || `Request failed (${purgeRes.status})` }
          )
        } catch (err) {
          setPurgeStatus({ success: false, error: err.message })
        }
      }
    } catch (err) {
      setPublishError(`Publish failed: ${err.message}`)
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div className="page">
      <section className="welcome-card">
        <h2>CA QB — Month Repair</h2>
        <p>
          Checks a month's already-published gameRoot.json/month zip against a calendar (by date embedded in each
          question's qid), fetches any day that's missing straight from its own day zip, then regenerates and
          republishes just the month zip and its gameRoot.json entry.
        </p>
      </section>

      <section className="form-card">
        <h3>Select month</h3>
        <div className="form-grid">
          <label className="field">
            <span>Month</span>
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {MONTH_NAMES.map((name, i) => (
                <option key={name} value={i + 1}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Year</span>
            <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
        </div>

        {rootLoading && <p className="field-hint">Loading gameRoot.json…</p>}
        {rootError && <div className="alert alert-error">{rootError}</div>}
        {monthLoading && <p className="field-hint">Loading {monthKey}.zip…</p>}
        {monthError && <div className="alert alert-error">{monthError}</div>}
        {root && !rootLoading && (
          <p className="field-hint">
            Current downloads entry for {monthKey}: {existingEntry ? `${existingEntry.desc} (v${existingEntry.ver})` : 'none yet'}
          </p>
        )}

        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={loadRoot} disabled={rootLoading}>
            Refresh gameRoot.json
          </button>
        </div>
      </section>

      {questions && (
        <section className="result-card">
          <div className="result-toolbar">
            <h3>Calendar — {MONTH_NAMES[month - 1]} {year}</h3>
            <span className="field-hint">{questions.length} total questions</span>
          </div>
          <div style={{ padding: '0 20px 20px' }}>
            <MonthCalendarGrid month={month} year={year} dayInfo={dayInfo} fetchingDay={fetchingDay} onFetchDay={handleFetchDay} />
          </div>
        </section>
      )}

      {questions && (
        <section className="form-card">
          <h3>Generate</h3>
          <div className="form-grid">
            <label className="field">
              <span>Month version (downloads ver)</span>
              <input type="text" value={versionOverride} onChange={(e) => setVersionOverride(e.target.value)} />
              <span className="field-hint">
                {existingEntry ? `Currently ${existingEntry.ver}` : 'No existing entry — will be created'}
              </span>
            </label>
          </div>

          {generateError && <div className="alert alert-error">{generateError}</div>}

          <div className="form-actions">
            <button type="button" className="btn btn-primary" onClick={handleGenerate}>
              Generate New JSON
            </button>
          </div>
        </section>
      )}

      {generated && (
        <section className="result-card">
          <div className="result-toolbar">
            <h3>Review before publish</h3>
            <div className="result-actions">
              <button type="button" className="btn btn-primary" onClick={handlePublish} disabled={publishing}>
                {publishing ? 'Publishing…' : 'Publish to Spaces'}
              </button>
            </div>
          </div>

          {publishError && (
            <div className="alert alert-error" style={{ margin: '0 20px 16px' }}>
              {publishError}
            </div>
          )}

          {publishResults && (
            <div style={{ padding: '0 20px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {publishResults.map((r) => (
                <div key={r.key} className={`alert ${r.success ? 'alert-success' : 'alert-error'}`}>
                  {r.key} — {r.success ? 'uploaded' : r.error}
                </div>
              ))}
              {purgeStatus && (
                <div className={`alert ${purgeStatus.success ? 'alert-success' : 'alert-error'}`}>
                  CDN cache purge — {purgeStatus.success ? 'succeeded' : purgeStatus.error}
                </div>
              )}
            </div>
          )}

          <div style={{ padding: '0 20px' }}>
            <label className="field">
              <span>gameRoot.json (editable)</span>
              <textarea
                className="textarea-mono"
                rows={12}
                value={generated.rootText}
                onChange={(e) => setGenerated((prev) => ({ ...prev, rootText: e.target.value }))}
              />
            </label>
          </div>
          <div style={{ padding: '16px 20px 20px' }}>
            <label className="field">
              <span>{monthKey}.json (editable — zipped as {monthKey}.zip on publish)</span>
              <textarea
                className="textarea-mono"
                rows={16}
                value={generated.monthText}
                onChange={(e) => setGenerated((prev) => ({ ...prev, monthText: e.target.value }))}
              />
            </label>
          </div>
        </section>
      )}
    </div>
  )
}

export default CaQbMonthRepair
