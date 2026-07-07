import { useEffect, useRef, useState } from 'react'
import { TOPICS_URL, WORKER_URL } from '../config/api'

const CONTENT_TYPES = [
  { value: 'spoken', label: 'Spoken' },
  { value: 'grammer', label: 'Grammar' },
  { value: 'word', label: 'Word' },
  { value: 'phrase', label: 'Phrase' },
]

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

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe || !resultHtml) return

    const doc = iframe.contentDocument
    doc.open()
    doc.write(resultHtml)
    doc.close()

    const resize = () => {
      iframe.style.height = `${doc.body.scrollHeight}px`
    }
    iframe.onload = resize
    resize()
  }, [resultHtml])

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

  function handleDownload() {
    if (!resultJson) return

    const [year, month, dayPart] = date.split('-')
    const fileName = `${dayPart}-${month}-${year}.json`

    const blob = new Blob([JSON.stringify(resultJson, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)

    URL.revokeObjectURL(url)
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

  return (
    <div className="page">
      <section className="welcome-card">
        <h2>Daily Bytes Parser</h2>
        <p>Generate a daily content card with Gemini, preview it, then download or publish the JSON.</p>
      </section>

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

        <div className="form-actions">
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

      {(loading || resultHtml) && (
        <section className="result-card">
          <div className="result-toolbar">
            <h3>Preview{fromCache && !loading && <span className="field-hint"> · loaded from local cache</span>}</h3>
            <div className="result-actions">
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
                Upload JSON
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
            <iframe ref={iframeRef} className="result-frame" title="Generated preview" />
          )}
        </section>
      )}
    </div>
  )
}

export default DailyBytesParser
