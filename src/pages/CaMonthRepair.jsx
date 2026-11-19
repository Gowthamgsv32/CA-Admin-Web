import { useEffect, useMemo, useState } from 'react'
import { CA_ROOT_URL, CURRENT_AFFAIRS_BASE, WORKER_URL } from '../config/api'
import { MONTH_NAMES, dayOfMonthFromDMY } from '../utils/dailyBytesPublish'
import { daysInMonth, dayFromCaQid, dmyForDay, monthKeyFor, patchMonthEntry } from '../utils/monthRepair'
import { findFormatIssues, findIdConflicts, validateCaQuestionEntry, validateCasEntry } from '../utils/monthRepairValidate'
import { buildMonthZipBytes } from '../utils/caPublish'
import { fetchFresh } from '../utils/freshFetch'
import { bytesToBase64 } from '../utils/zip'
import MonthCalendarGrid from '../components/MonthCalendarGrid'
import DataCheckAlerts from '../components/DataCheckAlerts'

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
      const res = await fetchFresh(CA_ROOT_URL)
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
    setConflicts([])
    setPublishResults(null)
    setMonthLoading(true)

    fetchFresh(`${CURRENT_AFFAIRS_BASE}/${monthKey}.json`)
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
    const totalDays = daysInMonth(month, year)
    if (monthJson) {
      for (const c of monthJson.cas) {
        const d = dayOfMonthFromDMY(c.date)
        const prev = map.get(d) || { present: true, casCount: 0, qCount: 0 }
        prev.casCount += 1
        map.set(d, prev)
      }
      for (const q of monthJson.questions) {
        const d = dayFromCaQid(q.qid, month, year, totalDays)
        if (!d) continue
        const prev = map.get(d) || { present: true, casCount: 0, qCount: 0 }
        prev.qCount += 1
        map.set(d, prev)
      }
    }
    for (const [day, message] of Object.entries(dayErrors)) {
      const d = Number(day)
      const prev = map.get(d) || { present: false }
      map.set(d, { ...prev, error: message })
    }
    for (const [d, info] of map) {
      if (info.present) map.set(d, { ...info, label: `${info.casCount || 0} cas · ${info.qCount || 0} q` })
    }
    return map
  }, [monthJson, dayErrors, month, year])

  const formatIssues = useMemo(() => {
    if (!monthJson) return []
    return [
      ...findFormatIssues(monthJson.cas, 'id', validateCasEntry),
      ...findFormatIssues(monthJson.questions, 'qid', validateCaQuestionEntry),
    ]
  }, [monthJson])

  // Recomputed live from root/monthJson/the edited version — so changing
  // the version (or fetching another day) always shows up here immediately
  // instead of requiring a separate "Generate" step that could silently go
  // stale and get published anyway.
  const preview = useMemo(() => {
    if (!root || !monthJson || !versionOverride.trim()) return null

    const ver = versionOverride.trim()
    // Every cas row carries its own "ver" (stamped from whatever the av_mos
    // entry's version was at the time it was generated) — re-stamp all of
    // them to the edited version so the content stays in sync with
    // root.json instead of showing whatever stale per-row value they had
    // when first generated.
    const contentVer = Number(ver) * 1000
    const restampedMonthJson = {
      cas: monthJson.cas.map((c) => ({ ...c, ver: contentVer })),
      questions: monthJson.questions,
    }

    const desc = `${restampedMonthJson.cas.length} Current Affairs, ${restampedMonthJson.questions.length} Questions`
    const { root: patchedRoot } = patchMonthEntry(root, {
      arrayKey: 'av_mos',
      monthKey,
      desc,
      ver,
      buildNewEntry: () => ({
        title: `${MONTH_NAMES[month - 1]} Current Affairs`,
        desc,
        url: `${CURRENT_AFFAIRS_BASE}/${monthKey}.json`,
        zip_url: `${CURRENT_AFFAIRS_BASE}/${monthKey}.zip`,
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
      const res = await fetchFresh(`${CURRENT_AFFAIRS_BASE}/${dateDMY}.json`)
      if (!res.ok) throw new Error(`No day file found (${res.status})`)
      const dayJson = await res.json()

      const base = monthJson || { cas: [], questions: [] }
      const newConflicts = [
        ...findIdConflicts(base.cas, dayJson.cas || [], 'id'),
        ...findIdConflicts(base.questions, dayJson.questions || [], 'qid'),
      ]
      if (newConflicts.length > 0) setConflicts((prev) => [...prev, ...newConflicts])

      setMonthJson((prev) => {
        const current = prev || { cas: [], questions: [] }
        const casById = new Map(current.cas.map((c) => [c.id, c]))
        for (const c of dayJson.cas || []) casById.set(c.id, c)
        const questionsByQid = new Map(current.questions.map((q) => [q.qid, q]))
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
                {existingEntry ? `Currently ${existingEntry.ver}` : 'No existing entry — will be created'} — the
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
              <span>root.json (editable)</span>
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

export default CaMonthRepair
