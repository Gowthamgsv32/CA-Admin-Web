import { useEffect, useRef, useState } from 'react'
import { AJAX_URL } from '../config/api'

const CONTENT_TYPES = [
  { value: 'word', label: 'Word' },
  { value: 'grammer', label: 'Grammar' },
  { value: 'spoken', label: 'Spoken' },
  { value: 'phrase', label: 'Phrase' },
]

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

function DailyBytesParser() {
  const [contentType, setContentType] = useState('')
  const [day, setDay] = useState('')
  const [date, setDate] = useState(todayISO)
  const [topic, setTopic] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resultHtml, setResultHtml] = useState('')
  const [resultJson, setResultJson] = useState(null)
  const [uploadStatus, setUploadStatus] = useState(null)

  const iframeRef = useRef(null)

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

    try {
      const res = await fetch(AJAX_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          action: 'test_ai',
          prompt: topic,
          day,
          valSelect: contentType,
        }),
      })

      if (!res.ok) throw new Error(`Request failed (${res.status})`)

      const result = await res.json()
      setResultHtml(result.html)
      setResultJson(result.json)
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
      const res = await fetch(AJAX_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          action: 'upload_json_to_spaces',
          date,
          json: JSON.stringify(resultJson),
        }),
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
            <span>Content type</span>
            <select value={contentType} onChange={(e) => setContentType(e.target.value)}>
              <option value="">Select an option</option>
              {CONTENT_TYPES.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

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

        <label className="field">
          <span>Topic</span>
          <textarea
            rows={4}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="What should today's tip be about?"
          />
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
            <h3>Preview</h3>
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
