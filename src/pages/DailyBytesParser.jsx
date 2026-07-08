import { useEffect, useMemo, useRef, useState } from 'react'
import { DAILY_BYTES_BASE, ROOT_URL, TOPICS_URL, VER_FILE_URL, WORKER_URL } from '../config/api'
import { buildNextRoot, buildNextVerFile, isoToDMY, monthKeyFromDMY } from '../utils/dailyBytesPublish'
import {
  BYTES_ORDER,
  buildDayBytesJson,
  loadStoredVersion,
  mergeBytesMonthJson,
  saveStoredVersion,
} from '../utils/dailyBytesJson'
import { bytesToBase64, createZip } from '../utils/zip'
import { downloadBlob } from '../utils/download'

const CONTENT_TYPES = [
  { value: 'spoken', label: 'Spoken' },
  { value: 'grammer', label: 'Grammar' },
  { value: 'word', label: 'Word' },
  { value: 'phrase', label: 'Phrase' },
]

const LABEL_BY_CONTENT_TYPE = Object.fromEntries(CONTENT_TYPES.map((c) => [c.value, c.label]))

// topics.json keys its "grammar" list without the typo our valSelect uses elsewhere.
const TOPICS_KEY_BY_CONTENT_TYPE = {
  word: 'word',
  grammer: 'grammar',
  spoken: 'spoken',
  phrase: 'phrase',
}

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

function cacheKey(contentType, day) {
  return `dailyBytes:${contentType}:${day}`
}

function loadFromCache(contentType, day) {
  try {
    const raw = localStorage.getItem(cacheKey(contentType, day))
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveToCache(contentType, day, payload) {
  try {
    localStorage.setItem(cacheKey(contentType, day), JSON.stringify(payload))
  } catch {
    // localStorage unavailable/full — not critical, just skip caching.
  }
}

function dayJsonCacheKey(day) {
  return `dailyBytesDayJson:${day}`
}

function monthJsonCacheKey(monthKey) {
  return `dailyBytesMonthJson:${monthKey}`
}

function zipFileFromMonthJson(monthKey, monthJson) {
  return createZip([
    { name: `${monthKey}.json`, data: new TextEncoder().encode(JSON.stringify(monthJson)) },
  ])
}

function DailyBytesParser() {
  const [contentType, setContentType] = useState('spoken')
  const [day, setDay] = useState('')
  const [date, setDate] = useState(todayISO)
  const [topic, setTopic] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resultHtml, setResultHtml] = useState('')
  const [resultJson, setResultJson] = useState(null)
  const [fromCache, setFromCache] = useState(false)
  const [uploadStatus, setUploadStatus] = useState(null)

  const [topicsData, setTopicsData] = useState(null)
  const [matchedPhase, setMatchedPhase] = useState('')

  const [convertError, setConvertError] = useState('')
  const [converting, setConverting] = useState(false)
  const [dayJson, setDayJson] = useState(null)
  const [monthJson, setMonthJson] = useState(null)
  const [zipBytes, setZipBytes] = useState(null)

  const [htmlPreviewExpanded, setHtmlPreviewExpanded] = useState(true)
  const [dayJsonExpanded, setDayJsonExpanded] = useState(true)
  const [monthJsonExpanded, setMonthJsonExpanded] = useState(true)

  const [currentRoot, setCurrentRoot] = useState(null)
  const [currentVerFile, setCurrentVerFile] = useState(null)
  const [loadingServerState, setLoadingServerState] = useState(true)
  const [serverStateError, setServerStateError] = useState('')

  const [publishing, setPublishing] = useState(false)
  const [publishStatus, setPublishStatus] = useState(null)

  const iframeRef = useRef(null)

  useEffect(() => {
    let cancelled = false

    fetch(TOPICS_URL)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setTopicsData(data)
      })
      .catch((err) => console.error('Failed to load topics.json:', err))

    return () => {
      cancelled = true
    }
  }, [])

  async function loadServerState() {
    setLoadingServerState(true)
    setServerStateError('')
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
      setServerStateError(err.message)
    } finally {
      setLoadingServerState(false)
    }
  }

  useEffect(() => {
    loadServerState()
  }, [])

  const selectedDateDMY = useMemo(() => (date ? isoToDMY(date) : ''), [date])
  const monthKey = useMemo(() => (selectedDateDMY ? monthKeyFromDMY(selectedDateDMY) : ''), [selectedDateDMY])

  const nextVerFile = useMemo(() => {
    if (!currentVerFile || !selectedDateDMY) return null
    return buildNextVerFile({ currentVerFile, selectedDateDMY })
  }, [currentVerFile, selectedDateDMY])

  // Every day always contributes exactly 4 bytes (grammer/spoken/phrase/word),
  // so the month's running "N Daily Bytes" count always advances by 4.
  const nextRootResult = useMemo(() => {
    if (!currentRoot || !selectedDateDMY) return null
    return buildNextRoot({ currentRoot, selectedDateDMY, casCount: 4, baseUrl: DAILY_BYTES_BASE })
  }, [currentRoot, selectedDateDMY])

  useEffect(() => {
    setMatchedPhase('')

    if (!topicsData || !contentType || !day.trim()) return

    const dayNum = Number(day)
    if (!Number.isFinite(dayNum)) return

    const key = TOPICS_KEY_BY_CONTENT_TYPE[contentType]
    const entry = topicsData[key]?.find((item) => item.day === dayNum)

    if (entry) {
      setTopic(entry.topic)
      setMatchedPhase(entry.phase)
    }
  }, [day, contentType, topicsData])

  // Cache-first preview: whenever the day or category changes, show a
  // previously generated result immediately if we have one, otherwise
  // clear the preview so it doesn't show a stale result for a different
  // day/category combination.
  useEffect(() => {
    setUploadStatus(null)
    setError('')
    setHtmlPreviewExpanded(true)

    if (!contentType || !day.trim()) {
      setResultHtml('')
      setResultJson(null)
      setFromCache(false)
      return
    }

    const cached = loadFromCache(contentType, day)
    if (cached) {
      setResultHtml(cached.html)
      setResultJson(cached.json)
      setFromCache(true)
    } else {
      setResultHtml('')
      setResultJson(null)
      setFromCache(false)
    }
  }, [contentType, day])

  // The combined day JSON is per-day (not per-category), so it gets its
  // own cache lookup keyed only on `day`.
  useEffect(() => {
    setConvertError('')
    setDayJsonExpanded(true)

    if (!day.trim()) {
      setDayJson(null)
      return
    }

    try {
      const raw = localStorage.getItem(dayJsonCacheKey(day))
      setDayJson(raw ? JSON.parse(raw) : null)
    } catch {
      setDayJson(null)
    }
  }, [day])

  // The month JSON (and its zip, rebuilt from it) is keyed on the selected
  // date's month, so it persists across day/category switches within the
  // same month and reloads from localStorage on a fresh page load.
  useEffect(() => {
    setMonthJson(null)
    setZipBytes(null)
    setMonthJsonExpanded(true)

    if (!monthKey) return

    try {
      const raw = localStorage.getItem(monthJsonCacheKey(monthKey))
      if (raw) {
        const parsed = JSON.parse(raw)
        setMonthJson(parsed)
        setZipBytes(zipFileFromMonthJson(monthKey, parsed))
      }
    } catch {
      // localStorage unavailable/corrupt — Convert JSON will rebuild it.
    }
  }, [monthKey])

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe || !resultHtml || !htmlPreviewExpanded) return

    const doc = iframe.contentDocument
    doc.open()
    doc.write(resultHtml)
    doc.close()

    const resize = () => {
      iframe.style.height = `${doc.body.scrollHeight}px`
    }
    iframe.onload = resize
    resize()
  }, [resultHtml, htmlPreviewExpanded])

  async function handleGenerate() {
    setUploadStatus(null)

    if (!contentType) {
      setError('Please choose a content type.')
      return
    }
    if (!topic.trim()) {
      setError('Please enter a topic.')
      return
    }
    if (!day.trim()) {
      setError('Please enter a day.')
      return
    }

    setError('')
    setLoading(true)
    setResultHtml('')
    setResultJson(null)
    setFromCache(false)

    try {
      const res = await fetch(`${WORKER_URL}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: topic, day, valSelect: contentType }),
      })

      const result = await res.json()
      if (result.error) throw new Error(result.error)

      setResultHtml(result.html)
      setResultJson(result.json)
      saveToCache(contentType, day, { html: result.html, json: result.json })
    } catch (err) {
      setError(`Something went wrong: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  async function handleConvert() {
    setConvertError('')
    setDayJson(null)
    setMonthJson(null)
    setZipBytes(null)
    setPublishStatus(null)
    setDayJsonExpanded(true)
    setMonthJsonExpanded(true)

    if (!day.trim()) {
      setConvertError('Please enter a day.')
      return
    }

    const missing = []
    const resultsByType = {}
    for (const type of BYTES_ORDER) {
      const cached = loadFromCache(type, day)
      if (!cached) {
        missing.push(LABEL_BY_CONTENT_TYPE[type])
      } else {
        resultsByType[type] = cached
      }
    }

    if (missing.length > 0) {
      setConvertError(`Generate these first for Day ${day}: ${missing.join(', ')}.`)
      return
    }

    setConverting(true)
    try {
      const dateDMY = isoToDMY(date)
      const dayMonthKey = monthKeyFromDMY(dateDMY)
      const provisionalVer = loadStoredVersion() + 1000
      const provisionalDay = buildDayBytesJson({ dateDMY, ver: provisionalVer, resultsByType })

      let currentMonthJson = null
      const monthRes = await fetch(`${DAILY_BYTES_BASE}/${dayMonthKey}.json`, { cache: 'no-store' })
      if (monthRes.ok) {
        currentMonthJson = await monthRes.json()
      } else if (monthRes.status !== 404) {
        throw new Error(`Failed to load ${dayMonthKey}.json (${monthRes.status})`)
      }

      const { bytes: mergedBytes, ver: finalVer } = mergeBytesMonthJson({
        currentMonthJson,
        dayBytes: provisionalDay.bytes,
        fallbackVer: provisionalVer,
      })

      const finalDayJson = {
        bytes: provisionalDay.bytes.map((entry) => ({ ...entry, ver: finalVer })),
      }
      const mergedMonthJson = { bytes: mergedBytes }
      const zipData = zipFileFromMonthJson(dayMonthKey, mergedMonthJson)

      try {
        localStorage.setItem(dayJsonCacheKey(day), JSON.stringify(finalDayJson))
        localStorage.setItem(monthJsonCacheKey(dayMonthKey), JSON.stringify(mergedMonthJson))
      } catch {
        // localStorage unavailable/full — the previews below still show the result.
      }
      saveStoredVersion(finalVer)

      setDayJson(finalDayJson)
      setMonthJson(mergedMonthJson)
      setZipBytes(zipData)
    } catch (err) {
      setConvertError(`Failed to build month JSON: ${err.message}`)
    } finally {
      setConverting(false)
    }
  }

  function handleDownloadDayJson() {
    if (!dayJson) return
    downloadBlob(JSON.stringify(dayJson, null, 2), `${isoToDMY(date)}.json`, 'application/json')
  }

  function handleDownloadMonthJson() {
    if (!monthJson || !monthKey) return
    downloadBlob(JSON.stringify(monthJson, null, 2), `${monthKey}.json`, 'application/json')
  }

  function handleDownloadZip() {
    if (!zipBytes || !monthKey) return
    downloadBlob(zipBytes, `${monthKey}.zip`, 'application/zip')
  }

  function handleDownload() {
    if (!resultJson) return

    const [year, month, dayPart] = date.split('-')
    downloadBlob(JSON.stringify(resultJson, null, 2), `${dayPart}-${month}-${year}.json`, 'application/json')
  }

  async function handleUpload() {
    if (!resultJson) return
    setUploadStatus(null)

    try {
      const res = await fetch(`${WORKER_URL}/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, json: resultJson }),
      })

      const result = await res.json()
      if (result.success) {
        setUploadStatus({ type: 'success', message: `Uploaded successfully: ${result.file}` })
      } else {
        setUploadStatus({ type: 'error', message: result.error || 'Upload failed.' })
      }
    } catch (err) {
      setUploadStatus({ type: 'error', message: `Upload error: ${err.message}` })
    }
  }

  const publishReady = Boolean(nextVerFile && nextRootResult && dayJson && monthJson && zipBytes)

  function handleDownloadAllFiles() {
    if (!publishReady) return

    downloadBlob(JSON.stringify(nextVerFile, null, 2), 'daily-bytes-ver.json', 'application/json')
    downloadBlob(JSON.stringify(nextRootResult.root, null, 2), 'daily-bytes-root.json', 'application/json')
    downloadBlob(JSON.stringify(dayJson, null, 2), `${selectedDateDMY}.json`, 'application/json')
    downloadBlob(JSON.stringify(monthJson, null, 2), `${monthKey}.json`, 'application/json')
    downloadBlob(zipBytes, `${monthKey}.zip`, 'application/zip')
  }

  async function handlePublishAll() {
    setPublishStatus(null)

    if (!selectedDateDMY || !monthKey) {
      setPublishStatus({ type: 'error', message: 'Please choose a date.' })
      return
    }
    if (!nextVerFile || !nextRootResult) {
      setPublishStatus({ type: 'error', message: 'Version/root file not ready — check Server State.' })
      return
    }
    if (!dayJson || !monthJson || !zipBytes) {
      setPublishStatus({ type: 'error', message: 'Click "Convert JSON" first to prepare the day, month and zip files.' })
      return
    }

    setPublishing(true)
    try {
      const files = [
        { key: 'Daily_Bytes/daily-bytes-ver.json', body: JSON.stringify(nextVerFile) },
        { key: 'Daily_Bytes/daily-bytes-root.json', body: JSON.stringify(nextRootResult.root) },
        { key: `Daily_Bytes/${selectedDateDMY}.json`, body: JSON.stringify(dayJson) },
        { key: `Daily_Bytes/${monthKey}.json`, body: JSON.stringify(monthJson) },
        {
          key: `Daily_Bytes/${monthKey}.zip`,
          bodyBase64: bytesToBase64(zipBytes),
          contentType: 'application/zip',
        },
      ]

      const res = await fetch(`${WORKER_URL}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files }),
      })

      const result = await res.json()
      const failed = (result.results || []).filter((r) => !r.success)

      if (failed.length > 0) {
        setPublishStatus({
          type: 'error',
          message: `Failed to upload: ${failed.map((f) => `${f.key} (${f.error})`).join('; ')}`,
        })
      } else {
        setPublishStatus({ type: 'success', message: `Published all 5 files for ${selectedDateDMY}.` })
        await loadServerState()
      }
    } catch (err) {
      setPublishStatus({ type: 'error', message: `Publish error: ${err.message}` })
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div className="page">
      <section className="welcome-card">
        <h2>Daily Bytes Parser</h2>
        <p>Generate a daily content card with Gemini, preview it, then download or publish the JSON.</p>
      </section>

      <div className="page-columns">
        <div className="page-col page-col-left">
          <section className="form-card">
            <div className="form-grid">
              <label className="field">
                <span>Day</span>
                <input
                  type="number"
                  value={day}
                  onChange={(e) => setDay(e.target.value)}
                  placeholder="e.g. 12"
                />
              </label>

              <label className="field">
                <span>Date</span>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </label>
            </div>

            <div className="field">
              <span>Content type</span>
              <div className="button-row">
                {CONTENT_TYPES.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`btn ${contentType === opt.value ? 'btn-primary' : 'btn-ghost'}`}
                    aria-pressed={contentType === opt.value}
                    onClick={() => setContentType(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="field">
              <span>Topic</span>
              <textarea
                rows={4}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="What should today's tip be about?"
              />
              {matchedPhase && <span className="field-hint">Prefilled from Day {day} · {matchedPhase}</span>}
            </label>

            {error && <div className="alert alert-error">{error}</div>}
            {convertError && <div className="alert alert-error">{convertError}</div>}

            <div className="form-actions">
              <button type="button" className="btn btn-ghost" onClick={handleConvert} disabled={converting}>
                {converting ? 'Converting…' : 'Convert JSON'}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleGenerate}
                disabled={loading}
              >
                {loading ? 'Thinking…' : 'Ask Gemini'}
              </button>
            </div>
          </section>

          <section className="form-card">
            <h3>Publish to Server</h3>
            <p className="field-hint">All 5 files must be ready before uploading with public access.</p>

            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: 'var(--text-muted)' }}>
              <li>{nextVerFile ? '✅' : '⬜'} Version file (daily-bytes-ver.json)</li>
              <li>{nextRootResult ? '✅' : '⬜'} Root file (daily-bytes-root.json)</li>
              <li>{dayJson ? '✅' : '⬜'} Day JSON ({selectedDateDMY || 'no date selected'})</li>
              <li>{monthJson ? '✅' : '⬜'} Month JSON ({monthKey || 'no date selected'})</li>
              <li>{zipBytes ? '✅' : '⬜'} Month ZIP ({monthKey ? `${monthKey}.zip` : 'no date selected'})</li>
            </ul>

            {publishStatus && (
              <div className={`alert ${publishStatus.type === 'success' ? 'alert-success' : 'alert-error'}`}>
                {publishStatus.message}
              </div>
            )}

            <div className="form-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={handleDownloadAllFiles}
                disabled={!publishReady}
              >
                Download All 5 Files
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handlePublishAll}
                disabled={!publishReady || publishing}
              >
                {publishing ? 'Uploading…' : 'Upload JSON'}
              </button>
            </div>
          </section>

          <section className="form-card">
            <h3>Server State</h3>

            {loadingServerState && <p className="field-hint">Loading root.json and daily-bytes-ver.json…</p>}
            {serverStateError && <div className="alert alert-error">{serverStateError}</div>}

            {!loadingServerState && currentVerFile && currentRoot && (
              <>
                <p className="field-hint">
                  Version file: v{currentVerFile.ver} ({currentVerFile.date})
                  {nextVerFile && ` → v${nextVerFile.ver} (${nextVerFile.date})`}
                </p>
                <p className="field-hint">
                  Root: v{currentRoot.ver}, last updated {currentRoot.date}
                  {nextRootResult && ` → v${nextRootResult.root.ver}, ${nextRootResult.root.date}`}
                </p>
                {currentRoot.av_mos?.[0] && (
                  <p className="field-hint">
                    Latest month "{currentRoot.av_mos[0].title}": {currentRoot.av_mos[0].desc} (v
                    {currentRoot.av_mos[0].ver})
                    {nextRootResult &&
                      ` → ${nextRootResult.root.av_mos[nextRootResult.monthEntryIndex].desc} (v${nextRootResult.root.av_mos[nextRootResult.monthEntryIndex].ver})`}
                  </p>
                )}
              </>
            )}

            <div className="form-actions">
              <button type="button" className="btn btn-ghost" onClick={loadServerState} disabled={loadingServerState}>
                Refresh
              </button>
            </div>
          </section>
        </div>

        <div className="page-col page-col-right">
          {(loading || resultHtml) && (
            <section className="result-card">
              <div className="result-toolbar">
                <h3>Preview{fromCache && !loading && <span className="field-hint"> · loaded from local cache</span>}</h3>
                <div className="result-actions">
                  {!loading && (
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => setHtmlPreviewExpanded((v) => !v)}
                      aria-expanded={htmlPreviewExpanded}
                    >
                      {htmlPreviewExpanded ? 'Collapse' : 'Expand'}
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={handleDownload}
                    disabled={!resultJson}
                  >
                    Download JSON
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={handleUpload}
                    disabled={!resultJson}
                  >
                    Upload Category JSON
                  </button>
                </div>
              </div>

              {uploadStatus && (
                <div className={`alert ${uploadStatus.type === 'success' ? 'alert-success' : 'alert-error'}`}>
                  {uploadStatus.message}
                </div>
              )}

              {loading ? (
                <div className="result-loading">Thinking…</div>
              ) : (
                htmlPreviewExpanded && <iframe ref={iframeRef} className="result-frame" title="Generated preview" />
              )}
            </section>
          )}

          {dayJson && (
            <section className="result-card">
              <div className="result-toolbar">
                <h3>Combined Day JSON</h3>
                <div className="result-actions">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setDayJsonExpanded((v) => !v)}
                    aria-expanded={dayJsonExpanded}
                  >
                    {dayJsonExpanded ? 'Collapse' : 'Expand'}
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={handleDownloadDayJson}>
                    Download JSON
                  </button>
                </div>
              </div>
              {dayJsonExpanded && <pre className="json-preview">{JSON.stringify(dayJson, null, 2)}</pre>}
            </section>
          )}

          {monthJson && (
            <section className="result-card">
              <div className="result-toolbar">
                <h3>Month JSON — {monthKey}</h3>
                <div className="result-actions">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setMonthJsonExpanded((v) => !v)}
                    aria-expanded={monthJsonExpanded}
                  >
                    {monthJsonExpanded ? 'Collapse' : 'Expand'}
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={handleDownloadMonthJson}>
                    Download JSON
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={handleDownloadZip} disabled={!zipBytes}>
                    Download ZIP
                  </button>
                </div>
              </div>
              <p className="field-hint" style={{ padding: '0 20px 12px' }}>
                {monthJson.bytes.length} total bytes for {monthKey}.
              </p>
              {monthJsonExpanded && <pre className="json-preview">{JSON.stringify(monthJson, null, 2)}</pre>}
            </section>
          )}
        </div>
      </div>
    </div>
  )
}

export default DailyBytesParser
