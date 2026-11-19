import { useEffect, useMemo, useState } from 'react'
import { RECALL_GAME_BASE, RECALL_GAME_ROOT_URL, WORKER_URL } from '../config/api'
import { MONTH_NAMES, dayOfMonthFromDMY } from '../utils/dailyBytesPublish'
import { dmyForDay, monthKeyFor, patchMonthEntry } from '../utils/monthRepair'
import { findFormatIssues, findIdConflicts, validateTopicEntry } from '../utils/monthRepairValidate'
import { bytesToBase64, createZip } from '../utils/zip'
import MonthCalendarGrid from '../components/MonthCalendarGrid'
import DataCheckAlerts from '../components/DataCheckAlerts'

function buildYearOptions() {
  const current = new Date().getFullYear()
  const years = []
  for (let y = current - 2; y <= current + 1; y++) years.push(y)
  return years
}

const YEARS = buildYearOptions()

function zipFileFromMonthJson(monthKey, monthJson) {
  return createZip([{ name: `${monthKey}.json`, data: new TextEncoder().encode(JSON.stringify(monthJson)) }])
}

function RecallGameMonthRepair() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())

  const [root, setRoot] = useState(null)
  const [rootLoading, setRootLoading] = useState(true)
  const [rootError, setRootError] = useState('')

  const [monthJson, setMonthJson] = useState(null) // { topics: [...] }
  const [monthLoading, setMonthLoading] = useState(false)
  const [monthError, setMonthError] = useState('')

  const [fetchingDay, setFetchingDay] = useState(null)
  const [dayErrors, setDayErrors] = useState({})
  const [conflicts, setConflicts] = useState([])

  const [versionOverride, setVersionOverride] = useState('')

  const [rootText, setRootText] = useState('')
  const [monthText, setMonthText] = useState('')

  const [publishing, setPublishing] = useState(false)
  const [publishResults, setPublishResults] = useState(null)
  const [publishError, setPublishError] = useState('')
  const [purgeStatus, setPurgeStatus] = useState(null)

  const monthKey = useMemo(() => monthKeyFor(month, year), [month, year])

  async function loadRoot() {
    setRootError('')
    setRootLoading(true)
    try {
      const res = await fetch(RECALL_GAME_ROOT_URL, { cache: 'no-store' })
      if (!res.ok) throw new Error(`Failed to load recall-root.json (${res.status})`)
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
    setConflicts([])
    setPublishResults(null)
    setMonthLoading(true)

    fetch(`${RECALL_GAME_BASE}/${monthKey}.json`, { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) {
          if (res.status === 404 || res.status === 403) return { topics: [] }
          throw new Error(`Failed to load ${monthKey}.json (${res.status})`)
        }
        return res.json()
      })
      .then((data) => setMonthJson({ topics: data.topics || [] }))
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
      for (const t of monthJson.topics) {
        const d = dayOfMonthFromDMY(t.date)
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
      if (info.present) map.set(d, { ...info, label: `${info.count} topics` })
    }
    return map
  }, [monthJson, dayErrors])

  const formatIssues = useMemo(() => {
    if (!monthJson) return []
    return findFormatIssues(monthJson.topics, 'id', validateTopicEntry)
  }, [monthJson])

  // Recomputed live from root/monthJson/the edited version — so changing
  // the version (or fetching another day) always shows up here immediately
  // instead of requiring a separate "Generate" step that could silently go
  // stale and get published anyway.
  const preview = useMemo(() => {
    if (!root || !monthJson || !versionOverride.trim()) return null

    const ver = versionOverride.trim()
    // Every object across the whole month shares one version number
    // (matching the existing Recall Game convention) — re-stamp all of
    // them to the edited version so the content stays in sync with
    // recall-root.json.
    const contentVer = Number(ver) * 1000
    const restampedMonthJson = { topics: monthJson.topics.map((t) => ({ ...t, ver: contentVer })) }

    const desc = `${restampedMonthJson.topics.length} Questions available`
    const { root: patchedRoot } = patchMonthEntry(root, {
      arrayKey: 'av_mos',
      monthKey,
      desc,
      ver,
      buildNewEntry: () => ({
        title: `${MONTH_NAMES[month - 1]} Daily Bytes`,
        desc,
        zip_url: `${RECALL_GAME_BASE}/${monthKey}.zip`,
        status: false,
        month: monthKey,
      }),
    })

    return {
      rootText: JSON.stringify(patchedRoot, null, 2),
      monthText: JSON.stringify(restampedMonthJson, null, 2),
    }
  }, [root, monthJson, versionOverride, monthKey, month])

  // Mirrors the live preview into the editable textareas whenever it
  // actually changes (version edited, a day fetched, root reloaded) — a
  // hand-edit to the textarea itself doesn't re-trigger this, so manual
  // tweaks survive until the next real input change.
  useEffect(() => {
    if (preview) {
      setRootText(preview.rootText)
      setMonthText(preview.monthText)
    }
  }, [preview])

  async function handleFetchDay(day) {
    const dateDMY = dmyForDay(day, month, year)
    setFetchingDay(day)
    setDayErrors((prev) => {
      const next = { ...prev }
      delete next[day]
      return next
    })
    try {
      const res = await fetch(`${RECALL_GAME_BASE}/${dateDMY}.json`, { cache: 'no-store' })
      if (!res.ok) throw new Error(`No day file found (${res.status})`)
      const dayJson = await res.json()

      const base = monthJson || { topics: [] }
      const newConflicts = findIdConflicts(base.topics, dayJson.topics || [], 'id')
      if (newConflicts.length > 0) setConflicts((prev) => [...prev, ...newConflicts])

      setMonthJson((prev) => {
        const current = prev || { topics: [] }
        const byId = new Map(current.topics.map((t) => [t.id, t]))
        for (const t of dayJson.topics || []) byId.set(t.id, t)
        return { topics: [...byId.values()].sort((a, b) => a.id - b.id) }
      })
    } catch (err) {
      setDayErrors((prev) => ({ ...prev, [day]: err.message }))
    } finally {
      setFetchingDay(null)
    }
  }

  async function handlePublish() {
    setPublishError('')
    setPublishResults(null)
    setPurgeStatus(null)

    let nextRoot
    let nextMonthJson
    try {
      nextRoot = JSON.parse(rootText)
      nextMonthJson = JSON.parse(monthText)
    } catch (err) {
      setPublishError(`Invalid JSON: ${err.message}`)
      return
    }

    setPublishing(true)
    try {
      const zipData = zipFileFromMonthJson(monthKey, nextMonthJson)
      const files = [
        { key: 'Recall-Game/recall-root.json', body: JSON.stringify(nextRoot) },
        { key: `Recall-Game/${monthKey}.json`, body: JSON.stringify(nextMonthJson) },
        { key: `Recall-Game/${monthKey}.zip`, bodyBase64: bytesToBase64(zipData), contentType: 'application/zip' },
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
        <h2>Recall Game — Month Repair</h2>
        <p>
          Checks a month's already-published recall-root.json/month.json against a calendar, fetches any day
          that's missing straight from its own day file, then regenerates and republishes just the month file and
          its recall-root.json entry.
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

        {rootLoading && <p className="field-hint">Loading recall-root.json…</p>}
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
            Refresh recall-root.json
          </button>
        </div>
      </section>

      {monthJson && (
        <section className="result-card">
          <div className="result-toolbar">
            <h3>Calendar — {MONTH_NAMES[month - 1]} {year}</h3>
            <span className="field-hint">{monthJson.topics.length} total topics</span>
          </div>
          <div style={{ padding: '0 20px 20px' }}>
            <MonthCalendarGrid month={month} year={year} dayInfo={dayInfo} fetchingDay={fetchingDay} onFetchDay={handleFetchDay} />
          </div>
          <div style={{ padding: '0 20px 20px' }}>
            <DataCheckAlerts conflicts={conflicts} formatIssues={formatIssues} />
          </div>
        </section>
      )}

      {monthJson && (
        <section className="form-card">
          <h3>Month version</h3>
          <div className="form-grid">
            <label className="field">
              <span>Month version (av_mos ver)</span>
              <input type="text" value={versionOverride} onChange={(e) => setVersionOverride(e.target.value)} />
              <span className="field-hint">
                {existingEntry ? `Currently ${existingEntry.ver}` : 'No existing entry — will be created'} — also
                re-stamps every topic in the month to {versionOverride ? Number(versionOverride) * 1000 : '…'}. The
                preview below updates automatically as you change this.
              </span>
            </label>
          </div>
        </section>
      )}

      {preview && (
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
              <span>recall-root.json (editable)</span>
              <textarea
                className="textarea-mono"
                rows={12}
                value={rootText}
                onChange={(e) => setRootText(e.target.value)}
              />
            </label>
          </div>
          <div style={{ padding: '16px 20px 20px' }}>
            <label className="field">
              <span>{monthKey}.json (editable)</span>
              <textarea
                className="textarea-mono"
                rows={16}
                value={monthText}
                onChange={(e) => setMonthText(e.target.value)}
              />
            </label>
          </div>
        </section>
      )}
    </div>
  )
}

export default RecallGameMonthRepair
