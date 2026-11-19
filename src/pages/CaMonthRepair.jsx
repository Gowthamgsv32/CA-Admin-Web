import { useEffect, useMemo, useState } from 'react'
import { CA_ROOT_URL, CURRENT_AFFAIRS_BASE, WORKER_URL } from '../config/api'
import { MONTH_NAMES, dayOfMonthFromDMY } from '../utils/dailyBytesPublish'
import { dmyForDay, monthKeyFor, patchMonthEntry } from '../utils/monthRepair'
import { buildMonthZipBytes } from '../utils/caPublish'
import { bytesToBase64 } from '../utils/zip'
import MonthCalendarGrid from '../components/MonthCalendarGrid'

function buildYearOptions() {
  const current = new Date().getFullYear()
  const years = []
  for (let y = current - 2; y <= current + 1; y++) years.push(y)
  return years
}

const YEARS = buildYearOptions()

function CaMonthRepair() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())

  const [root, setRoot] = useState(null)
  const [rootLoading, setRootLoading] = useState(true)
  const [rootError, setRootError] = useState('')

  const [monthJson, setMonthJson] = useState(null) // { cas, questions }
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
      const res = await fetch(CA_ROOT_URL, { cache: 'no-store' })
      if (!res.ok) throw new Error(`Failed to load root.json (${res.status})`)
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
    setMonthJson(null)
    setDayErrors({})
    setGenerated(null)
    setPublishResults(null)
    setMonthLoading(true)

    fetch(`${CURRENT_AFFAIRS_BASE}/${monthKey}.json`, { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) {
          if (res.status === 404 || res.status === 403) return { cas: [], questions: [] }
          throw new Error(`Failed to load ${monthKey}.json (${res.status})`)
        }
        return res.json()
      })
      .then((data) => setMonthJson({ cas: data.cas || [], questions: data.questions || [] }))
      .catch((err) => setMonthError(err.message))
      .finally(() => setMonthLoading(false))
  }, [monthKey])

  const existingEntry = useMemo(() => root?.av_mos?.find((m) => m.month === monthKey), [root, monthKey])

  useEffect(() => {
    setVersionOverride(String((Number(existingEntry?.ver) || 0) + 1))
  }, [existingEntry])

  const dayInfo = useMemo(() => {
    const map = new Map()
    if (monthJson) {
      for (const c of monthJson.cas) {
        const d = dayOfMonthFromDMY(c.date)
        const prev = map.get(d) || { present: true, count: 0 }
        prev.count += 1
        map.set(d, prev)
      }
    }
    for (const [day, message] of Object.entries(dayErrors)) {
      const d = Number(day)
      const prev = map.get(d) || { present: false }
      map.set(d, { ...prev, error: message })
    }
    for (const [d, info] of map) {
      if (info.present) map.set(d, { ...info, label: `${info.count} cas` })
    }
    return map
  }, [monthJson, dayErrors])

  async function handleFetchDay(day) {
    const dateDMY = dmyForDay(day, month, year)
    setFetchingDay(day)
    setDayErrors((prev) => {
      const next = { ...prev }
      delete next[day]
      return next
    })
    try {
      const res = await fetch(`${CURRENT_AFFAIRS_BASE}/${dateDMY}.json`, { cache: 'no-store' })
      if (!res.ok) throw new Error(`No day file found (${res.status})`)
      const dayJson = await res.json()

      setMonthJson((prev) => {
        const base = prev || { cas: [], questions: [] }
        const casById = new Map(base.cas.map((c) => [c.id, c]))
        for (const c of dayJson.cas || []) casById.set(c.id, c)
        const questionsByQid = new Map(base.questions.map((q) => [q.qid, q]))
        for (const q of dayJson.questions || []) questionsByQid.set(q.qid, q)
        return {
          cas: [...casById.values()].sort((a, b) => a.id - b.id),
          questions: [...questionsByQid.values()],
        }
      })
    } catch (err) {
      setDayErrors((prev) => ({ ...prev, [day]: err.message }))
    } finally {
      setFetchingDay(null)
    }
  }

  function handleGenerate() {
    setGenerateError('')
    setGenerated(null)
    setPublishResults(null)

    if (!root || !monthJson) {
      setGenerateError('Load root.json and the month data first.')
      return
    }
    if (!versionOverride.trim()) {
      setGenerateError('Enter a version for this month.')
      return
    }

    const desc = `${monthJson.cas.length} Current Affairs, ${monthJson.questions.length} Questions`
    const { root: patchedRoot } = patchMonthEntry(root, {
      arrayKey: 'av_mos',
      monthKey,
      desc,
      ver: versionOverride.trim(),
      buildNewEntry: () => ({
        title: `${MONTH_NAMES[month - 1]} Current Affairs`,
        desc,
        url: `${CURRENT_AFFAIRS_BASE}/${monthKey}.json`,
        zip_url: `${CURRENT_AFFAIRS_BASE}/${monthKey}.zip`,
        status: false,
        month: monthKey,
      }),
    })

    setGenerated({
      rootText: JSON.stringify(patchedRoot, null, 2),
      monthText: JSON.stringify(monthJson, null, 2),
    })
  }

  async function handlePublish() {
    setPublishError('')
    setPublishResults(null)
    setPurgeStatus(null)

    let nextRoot
    let nextMonthJson
    try {
      nextRoot = JSON.parse(generated.rootText)
      nextMonthJson = JSON.parse(generated.monthText)
    } catch (err) {
      setPublishError(`Invalid JSON: ${err.message}`)
      return
    }

    setPublishing(true)
    try {
      const monthZipBytes = buildMonthZipBytes(nextMonthJson, monthKey)
      const files = [
        { key: 'CurrentAffairs/root.json', contentType: 'application/json', body: JSON.stringify(nextRoot) },
        {
          key: `CurrentAffairs/${monthKey}.json`,
          contentType: 'application/json',
          body: JSON.stringify(nextMonthJson),
        },
        {
          key: `CurrentAffairs/${monthKey}.zip`,
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
        setMonthJson(nextMonthJson)

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
        <h2>CA Parser — Month Repair</h2>
        <p>
          Checks a month's already-published root.json/month.json against a calendar, fetches any day that's
          missing straight from its own day file, then regenerates and republishes just the month file and its
          root.json entry.
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

        {rootLoading && <p className="field-hint">Loading root.json…</p>}
        {rootError && <div className="alert alert-error">{rootError}</div>}
        {monthLoading && <p className="field-hint">Loading {monthKey}.json…</p>}
        {monthError && <div className="alert alert-error">{monthError}</div>}
        {root && !rootLoading && (
          <p className="field-hint">
            Current av_mos entry for {monthKey}: {existingEntry ? `${existingEntry.desc} (v${existingEntry.ver})` : 'none yet'}
          </p>
        )}

        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={loadRoot} disabled={rootLoading}>
            Refresh root.json
          </button>
        </div>
      </section>

      {monthJson && (
        <section className="result-card">
          <div className="result-toolbar">
            <h3>Calendar — {MONTH_NAMES[month - 1]} {year}</h3>
            <span className="field-hint">
              {monthJson.cas.length} cas · {monthJson.questions.length} questions
            </span>
          </div>
          <div style={{ padding: '0 20px 20px' }}>
            <MonthCalendarGrid month={month} year={year} dayInfo={dayInfo} fetchingDay={fetchingDay} onFetchDay={handleFetchDay} />
          </div>
        </section>
      )}

      {monthJson && (
        <section className="form-card">
          <h3>Generate</h3>
          <div className="form-grid">
            <label className="field">
              <span>Month version (av_mos ver)</span>
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
              <span>root.json (editable)</span>
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
              <span>{monthKey}.json (editable)</span>
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

export default CaMonthRepair
