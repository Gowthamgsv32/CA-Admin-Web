import { useEffect, useMemo, useState } from 'react'
import { DAILY_BYTES_BASE, ROOT_URL, VER_FILE_URL, WORKER_URL } from '../config/api'
import { bytesToBase64, createZip } from '../utils/zip'
import {
  buildNextRoot,
  buildNextVerFile,
  isoToDMY,
  mergeMonthJson,
  monthKeyFromDMY,
} from '../utils/dailyBytesPublish'

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

function parseDayJson(text) {
  if (!text.trim()) return { data: null, error: '' }
  try {
    const parsed = JSON.parse(text)
    if (!Array.isArray(parsed.cas)) throw new Error('Missing a "cas" array.')
    if (parsed.questions && !Array.isArray(parsed.questions)) {
      throw new Error('"questions" must be an array.')
    }
    return { data: parsed, error: '' }
  } catch (err) {
    return { data: null, error: err.message }
  }
}

function CAParser() {
  const [currentRoot, setCurrentRoot] = useState(null)
  const [currentVerFile, setCurrentVerFile] = useState(null)
  const [loadingCurrent, setLoadingCurrent] = useState(true)
  const [currentError, setCurrentError] = useState('')

  const [selectedDate, setSelectedDate] = useState(todayISO)
  const [dayJsonText, setDayJsonText] = useState('')

  const [rootVerInput, setRootVerInput] = useState('')
  const [monthVerInput, setMonthVerInput] = useState('')
  const [verFileVerInput, setVerFileVerInput] = useState('')

  const [publishing, setPublishing] = useState(false)
  const [publishError, setPublishError] = useState('')
  const [publishResults, setPublishResults] = useState(null)

  const selectedDateDMY = useMemo(() => (selectedDate ? isoToDMY(selectedDate) : ''), [selectedDate])
  const monthKey = useMemo(() => (selectedDateDMY ? monthKeyFromDMY(selectedDateDMY) : ''), [selectedDateDMY])
  const dayJsonParsed = useMemo(() => parseDayJson(dayJsonText), [dayJsonText])

  const preview = useMemo(() => {
    if (!currentRoot || !selectedDateDMY || !dayJsonParsed.data) return null
    return buildNextRoot({
      currentRoot,
      selectedDateDMY,
      casCount: dayJsonParsed.data.cas.length,
      baseUrl: DAILY_BYTES_BASE,
    })
  }, [currentRoot, selectedDateDMY, dayJsonParsed.data])

  async function loadCurrentState() {
    setLoadingCurrent(true)
    setCurrentError('')
    try {
      const [rootRes, verRes] = await Promise.all([
        fetch(ROOT_URL, { cache: 'no-store' }),
        fetch(VER_FILE_URL, { cache: 'no-store' }),
      ])
      if (!rootRes.ok) throw new Error(`Failed to load root.json (${rootRes.status})`)
      if (!verRes.ok) throw new Error(`Failed to load ver.json (${verRes.status})`)
      setCurrentRoot(await rootRes.json())
      setCurrentVerFile(await verRes.json())
    } catch (err) {
      setCurrentError(err.message)
    } finally {
      setLoadingCurrent(false)
    }
  }

  useEffect(() => {
    loadCurrentState()
  }, [])

  useEffect(() => {
    if (!preview) return
    setRootVerInput(preview.root.ver)
    setMonthVerInput(preview.root.av_mos[preview.monthEntryIndex].ver)
  }, [preview])

  useEffect(() => {
    if (!currentVerFile || !selectedDateDMY) return
    setVerFileVerInput(String(Number(currentVerFile.ver) + 1))
  }, [currentVerFile, selectedDateDMY])

  async function handlePublish() {
    setPublishError('')
    setPublishResults(null)

    if (!currentRoot || !currentVerFile) {
      setPublishError('Current root/version files have not loaded yet.')
      return
    }
    if (!dayJsonParsed.data) {
      setPublishError(dayJsonParsed.error || 'Please paste valid day JSON first.')
      return
    }

    setPublishing(true)
    try {
      let currentMonthJson = null
      try {
        const res = await fetch(`${DAILY_BYTES_BASE}/${monthKey}.json`, { cache: 'no-store' })
        if (res.ok) currentMonthJson = await res.json()
      } catch {
        // Treated as a brand-new month below.
      }

      const nextMonthJson = mergeMonthJson({ currentMonthJson, dayJson: dayJsonParsed.data })

      const { root: computedRoot, monthEntryIndex } = buildNextRoot({
        currentRoot,
        selectedDateDMY,
        casCount: dayJsonParsed.data.cas.length,
        baseUrl: DAILY_BYTES_BASE,
      })

      const finalRoot = { ...computedRoot, ver: String(rootVerInput) }
      finalRoot.av_mos = finalRoot.av_mos.map((entry, i) =>
        i === monthEntryIndex ? { ...entry, ver: String(monthVerInput) } : entry
      )

      const finalVerFile = {
        ...buildNextVerFile({ currentVerFile, selectedDateDMY }),
        ver: Number(verFileVerInput),
      }

      const zipBytes = createZip([
        { name: `${monthKey}.json`, data: new TextEncoder().encode(JSON.stringify(nextMonthJson)) },
      ])

      const files = [
        {
          key: `Daily_Bytes/${selectedDateDMY}.json`,
          contentType: 'application/json',
          body: JSON.stringify(dayJsonParsed.data),
        },
        {
          key: `Daily_Bytes/${monthKey}.json`,
          contentType: 'application/json',
          body: JSON.stringify(nextMonthJson),
        },
        {
          key: 'Daily_Bytes/daily-bytes-root.json',
          contentType: 'application/json',
          body: JSON.stringify(finalRoot),
        },
        {
          key: 'Daily_Bytes/daily-bytes-ver.json',
          contentType: 'application/json',
          body: JSON.stringify(finalVerFile),
        },
        {
          key: `Daily_Bytes/${monthKey}.zip`,
          contentType: 'application/zip',
          bodyBase64: bytesToBase64(zipBytes),
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
        setCurrentRoot(finalRoot)
        setCurrentVerFile(finalVerFile)
      }
    } catch (err) {
      setPublishError(`Publish failed: ${err.message}`)
    } finally {
      setPublishing(false)
    }
  }

  const monthEntry = preview?.root.av_mos[preview.monthEntryIndex]

  return (
    <div className="page">
      <section className="welcome-card">
        <h2>CAParser</h2>
        <p>Publish a day's current-affairs bytes: updates the day, month, root, and version files on Spaces.</p>
      </section>

      <section className="form-card">
        <h3>Current state</h3>
        {loadingCurrent && <p className="field-hint">Loading root.json and daily-bytes-ver.json…</p>}
        {currentError && <div className="alert alert-error">{currentError}</div>}
        {currentRoot && currentVerFile && !loadingCurrent && (
          <p className="field-hint">
            Live date {currentRoot.date} · root ver {currentRoot.ver} · file ver {currentVerFile.ver}
          </p>
        )}
        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={loadCurrentState} disabled={loadingCurrent}>
            Refresh
          </button>
        </div>
      </section>

      <section className="form-card">
        <div className="form-grid">
          <label className="field">
            <span>Date</span>
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
          </label>
        </div>

        <label className="field">
          <span>Day JSON ({`cas` } + {`questions`})</span>
          <textarea
            rows={10}
            className="textarea-mono"
            value={dayJsonText}
            onChange={(e) => setDayJsonText(e.target.value)}
            placeholder="Paste the day's JSON here…"
          />
          {dayJsonParsed.error && <span className="field-hint">{dayJsonParsed.error}</span>}
          {dayJsonParsed.data && (
            <span className="field-hint">
              {dayJsonParsed.data.cas.length} cas cards · {(dayJsonParsed.data.questions || []).length} questions
            </span>
          )}
        </label>

        {preview && (
          <div className="form-grid">
            <label className="field">
              <span>Root version</span>
              <input type="text" value={rootVerInput} onChange={(e) => setRootVerInput(e.target.value)} />
            </label>
            <label className="field">
              <span>Version file</span>
              <input type="text" value={verFileVerInput} onChange={(e) => setVerFileVerInput(e.target.value)} />
            </label>
            <label className="field">
              <span>{preview.isNewMonth ? `New month (${monthEntry?.month}) version` : `${monthEntry?.month} version`}</span>
              <input type="text" value={monthVerInput} onChange={(e) => setMonthVerInput(e.target.value)} />
            </label>
          </div>
        )}

        {preview && (
          <p className="field-hint">
            {preview.isNewMonth
              ? `Will create a new month entry: "${monthEntry?.title}" (${monthEntry?.desc}).`
              : `Will update "${monthEntry?.title}" to ${monthEntry?.desc}.`}
            {' '}Day file: Daily_Bytes/{selectedDateDMY}.json
          </p>
        )}

        {publishError && <div className="alert alert-error">{publishError}</div>}

        <div className="form-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={handlePublish}
            disabled={publishing || !preview}
          >
            {publishing ? 'Publishing…' : 'Publish'}
          </button>
        </div>
      </section>

      {publishResults && (
        <section className="result-card">
          <div className="result-toolbar">
            <h3>Publish results</h3>
          </div>
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {publishResults.map((r) => (
              <div key={r.key} className={`alert ${r.success ? 'alert-success' : 'alert-error'}`}>
                {r.key} — {r.success ? 'uploaded' : r.error}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

export default CAParser
