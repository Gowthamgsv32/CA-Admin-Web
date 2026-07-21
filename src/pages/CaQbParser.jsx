import { useEffect, useMemo, useState } from 'react'
import { CA_GAME_BASE, CA_GAME_QB_ROOT_URL, CURRENT_AFFAIRS_BASE, WORKER_URL } from '../config/api'
import { isoToDMY, monthKeyFromDMY } from '../utils/dailyBytesPublish'
import { downloadBlob } from '../utils/download'
import { buildNextGameRoot } from '../utils/caPublish'
import { bytesToBase64, createZip, extractFirstFileFromZip } from '../utils/zip'

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

const LANGS = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'हिंदी' },
  { value: 'ta', label: 'தமிழ்' },
]

const TYPE_LABELS = {
  MCQ: 'MCQ',
  STATEMENT: 'Statement',
  MATCH: 'Match',
  FILL_BLANK: 'Fill in the Blank',
}

const TYPE_CLASS = {
  MCQ: 'qb-badge--type-mcq',
  STATEMENT: 'qb-badge--type-statement',
  MATCH: 'qb-badge--type-match',
  FILL_BLANK: 'qb-badge--type-fill-blank',
}

const DIFFICULTY_CLASS = {
  Easy: 'qb-badge--diff-easy',
  Medium: 'qb-badge--diff-medium',
  Hard: 'qb-badge--diff-hard',
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D']

function CaQbParser() {
  const [date, setDate] = useState(todayISO)
  const [dayLoading, setDayLoading] = useState(false)
  const [dayError, setDayError] = useState('')
  const [dayData, setDayData] = useState(null)

  const [generating, setGenerating] = useState(false)
  const [generateProgress, setGenerateProgress] = useState('')
  const [generateError, setGenerateError] = useState('')
  const [questions, setQuestions] = useState([])

  // One entry per dayData.cas article, same index — tracks per-article
  // progress so a single Gemini failure (or a bad JSON parse) doesn't lose
  // every other article's already-generated questions and force a full
  // restart. { status: 'idle' | 'loading' | 'success' | 'error', error }
  const [articleStatus, setArticleStatus] = useState([])

  const [previewLang, setPreviewLang] = useState('en')

  const [gameRoot, setGameRoot] = useState(null)
  const [gameRootLoading, setGameRootLoading] = useState(false)
  const [gameRootError, setGameRootError] = useState('')

  const [gameMonthJson, setGameMonthJson] = useState(null)
  const [gameMonthLoading, setGameMonthLoading] = useState(false)
  const [gameMonthError, setGameMonthError] = useState('')

  const [publishingGame, setPublishingGame] = useState(false)
  const [publishGameError, setPublishGameError] = useState('')
  const [publishGameResults, setPublishGameResults] = useState(null)
  const [purgeGameStatus, setPurgeGameStatus] = useState(null)

  const dateDMY = useMemo(() => (date ? isoToDMY(date) : ''), [date])
  const monthKey = useMemo(() => (dateDMY ? monthKeyFromDMY(dateDMY) : ''), [dateDMY])

  async function handleFetchDay() {
    setDayError('')
    setDayData(null)
    setQuestions([])
    setArticleStatus([])
    setGenerateError('')

    if (!dateDMY) {
      setDayError('Please choose a date.')
      return
    }

    setDayLoading(true)
    try {
      const res = await fetch(`${CURRENT_AFFAIRS_BASE}/${dateDMY}.json`, { cache: 'no-store' })
      if (!res.ok) throw new Error(`No current affairs found for ${dateDMY} (${res.status})`)
      const data = await res.json()
      if (!Array.isArray(data.cas) || data.cas.length === 0) {
        throw new Error(`${dateDMY}.json has no "cas" entries.`)
      }
      setDayData(data)
    } catch (err) {
      setDayError(err.message)
    } finally {
      setDayLoading(false)
    }
  }

  function setStatusAt(index, patch) {
    setArticleStatus((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)))
  }

  // Generates one article's questions and appends them to `questions`
  // (qid continues from whatever's already there, so retries just add on
  // at the end rather than disturbing already-assigned qids). Never throws —
  // failures are recorded on articleStatus[index] so the caller can move on
  // to the next article instead of aborting the whole batch.
  async function generateArticle(index) {
    const article = dayData.cas[index]
    setStatusAt(index, { status: 'loading', error: '' })

    try {
      const res = await fetch(`${WORKER_URL}/generate-ca-qb`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: article.title_en, text: article.desc_en }),
      })
      const result = await res.json()
      if (!res.ok || result.error) {
        throw new Error(result.error || `Request failed (${res.status})`)
      }

      const dateDigits = dateDMY.replace(/-/g, '')
      setQuestions((prev) => [
        ...prev,
        ...result.data.map((q, i) => ({ qid: String(`${dateDigits}${prev.length + i + 1}`), ...q })),
      ])
      setStatusAt(index, { status: 'success', error: '' })
    } catch (err) {
      setStatusAt(index, { status: 'error', error: err.message })
    }
  }

  async function handleGenerateQb() {
    setGenerateError('')
    setQuestions([])

    if (!dayData?.cas?.length) {
      setGenerateError('Fetch a day with current affairs entries first.')
      return
    }

    setArticleStatus(dayData.cas.map(() => ({ status: 'idle', error: '' })))

    setGenerating(true)
    try {
      for (let i = 0; i < dayData.cas.length; i++) {
        setGenerateProgress(`Generating ${i + 1} of ${dayData.cas.length}: ${dayData.cas[i].title_en}`)
        await generateArticle(i)
      }
    } finally {
      setGenerating(false)
      setGenerateProgress('')
    }
  }

  async function handleRetryArticle(index) {
    await generateArticle(index)
  }

  async function handleRetryFailed() {
    setGenerating(true)
    try {
      for (let i = 0; i < articleStatus.length; i++) {
        if (articleStatus[i]?.status === 'error') {
          setGenerateProgress(`Retrying ${i + 1} of ${dayData.cas.length}: ${dayData.cas[i].title_en}`)
          await generateArticle(i)
        }
      }
    } finally {
      setGenerating(false)
      setGenerateProgress('')
    }
  }

  const failedCount = useMemo(
    () => articleStatus.filter((s) => s.status === 'error').length,
    [articleStatus]
  )
  // Covers both the bulk loop (`generating`) and a lone row retry fired via
  // its own Retry button — disabling actions during either prevents a
  // concurrent full re-generate from clobbering an in-flight retry's slot.
  const anyLoading = generating || articleStatus.some((s) => s.status === 'loading')

  function handleDownloadDayJson() {
    if (questions.length === 0) return
    downloadBlob(JSON.stringify(questions, null, 2), `${dateDMY}-qb.json`, 'application/json')
  }

  const typeCounts = useMemo(() => {
    const counts = {}
    for (const q of questions) counts[q.type] = (counts[q.type] || 0) + 1
    return counts
  }, [questions])

  async function handleLoadGameRoot() {
    setGameRootError('')
    setGameRootLoading(true)
    try {
      const res = await fetch(CA_GAME_QB_ROOT_URL, { cache: 'no-store' })
      if (!res.ok) throw new Error(`Failed to load gameRoot.json (${res.status})`)
      setGameRoot(await res.json())
    } catch (err) {
      setGameRootError(err.message)
    } finally {
      setGameRootLoading(false)
    }
  }

  useEffect(() => {
    handleLoadGameRoot()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // gameRoot.json's month zip is shared with the Cagame feature's own
  // day/month zips (same Cagame/{month}.zip file), so this pulls the JSON
  // back out of it the same way — extract, then merge this day's questions
  // into whatever's already published for the month.
  useEffect(() => {
    if (!monthKey) return
    setGameMonthError('')
    setGameMonthLoading(true)
    fetch(`${CA_GAME_BASE}/${monthKey}.zip`, { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) {
          if (res.status === 404 || res.status === 403) return { questions: [] }
          throw new Error(`Failed to load ${monthKey}.zip (${res.status})`)
        }
        const buffer = new Uint8Array(await res.arrayBuffer())
        const jsonBytes = extractFirstFileFromZip(buffer)
        return JSON.parse(new TextDecoder().decode(jsonBytes))
      })
      .then((data) => setGameMonthJson({ questions: Array.isArray(data.questions) ? data.questions : [] }))
      .catch((err) => {
        setGameMonthError(err.message)
        setGameMonthJson({ questions: [] })
      })
      .finally(() => setGameMonthLoading(false))
  }, [monthKey])

  const gameMergedMonthJson = useMemo(() => {
    if (!gameMonthJson) return null
    return { questions: [...gameMonthJson.questions, ...questions] }
  }, [gameMonthJson, questions])

  const gameRootPreview = useMemo(() => {
    if (!gameRoot || !dateDMY || !gameMergedMonthJson) return null
    return buildNextGameRoot({
      currentGameRoot: gameRoot,
      selectedDateDMY: dateDMY,
      monthQuestionsCount: gameMergedMonthJson.questions.length,
      baseUrl: CA_GAME_BASE,
    })
  }, [gameRoot, dateDMY, gameMergedMonthJson])

  function handleDownloadGameZip() {
    if (!gameRootPreview || questions.length === 0 || !gameMergedMonthJson || !dateDMY || !monthKey) return
    const dayZipBytes = createZip([
      { name: `${dateDMY}.json`, data: new TextEncoder().encode(JSON.stringify({ questions })) },
    ])
    const monthZipBytes = createZip([
      { name: `${monthKey}.json`, data: new TextEncoder().encode(JSON.stringify(gameMergedMonthJson)) },
    ])
    const files = [
      { name: 'gameRoot.json', data: new TextEncoder().encode(JSON.stringify(gameRootPreview.root, null, 2)) },
      { name: `${dateDMY}.zip`, data: dayZipBytes },
      { name: `${monthKey}.zip`, data: monthZipBytes },
    ]
    downloadBlob(createZip(files), `Cagame-qb-${dateDMY}.zip`, 'application/zip')
  }

  async function handlePublishGameFiles() {
    setPublishGameError('')
    setPublishGameResults(null)
    setPurgeGameStatus(null)

    if (!gameRootPreview || questions.length === 0 || !gameMergedMonthJson || !dateDMY || !monthKey) {
      setPublishGameError('Generate the question bank first.')
      return
    }

    setPublishingGame(true)
    try {
      const dayZipBytes = createZip([
        { name: `${dateDMY}.json`, data: new TextEncoder().encode(JSON.stringify({ questions })) },
      ])
      const monthZipBytes = createZip([
        { name: `${monthKey}.json`, data: new TextEncoder().encode(JSON.stringify(gameMergedMonthJson)) },
      ])

      const files = [
        { key: 'Cagame/gameRoot.json', contentType: 'application/json', body: JSON.stringify(gameRootPreview.root) },
        {
          key: `Cagame/${dateDMY}.zip`,
          contentType: 'application/zip',
          bodyBase64: bytesToBase64(dayZipBytes),
        },
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
      setPublishGameResults(result.results)

      if (result.results?.every((r) => r.success)) {
        setGameRoot(gameRootPreview.root)
        setGameMonthJson(gameMergedMonthJson)

        try {
          const purgeRes = await fetch(`${WORKER_URL}/purge-cdn`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ files: files.map((f) => f.key) }),
          })
          const purgeResult = await purgeRes.json()
          if (purgeRes.ok && purgeResult.success) {
            setPurgeGameStatus({ success: true })
          } else {
            setPurgeGameStatus({
              success: false,
              error: purgeResult.error || `Request failed (${purgeRes.status})`,
            })
          }
        } catch (err) {
          setPurgeGameStatus({ success: false, error: err.message })
        }
      }
    } catch (err) {
      setPublishGameError(`Publish failed: ${err.message}`)
    } finally {
      setPublishingGame(false)
    }
  }

  return (
    <div className="page">
      <section className="welcome-card">
        <h2>CA QB Parser</h2>
        <p>
          Turns a day's Current Affairs articles into a full exam-style question bank — MCQ, Statement, Match, and
          Fill-in-the-Blank questions in English, Hindi, and Tamil.
        </p>
      </section>

      <section className="form-card">
        <h3>Fetch current affairs</h3>
        <p className="field-hint">Reads the day's cas entries from CurrentAffairs/{'{date}'}.json.</p>

        <div className="form-grid">
          <label className="field">
            <span>Date</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
        </div>

        {dayError && <div className="alert alert-error">{dayError}</div>}

        <div className="form-actions">
          <button type="button" className="btn btn-primary" onClick={handleFetchDay} disabled={dayLoading}>
            {dayLoading ? 'Fetching…' : 'Fetch Day'}
          </button>
        </div>
      </section>

      {dayData && (
        <section className="form-card">
          <h3>Generate Question Bank</h3>
          <p className="field-hint">
            {dayData.cas.length} article{dayData.cas.length === 1 ? '' : 's'} for {dateDMY} — generates at least 2
            questions per article (one Gemini call each).
          </p>

          <div className="ca-table-wrap" style={{ maxHeight: 200 }}>
            <table className="ca-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Category</th>
                  {articleStatus.length > 0 && <th>Status</th>}
                </tr>
              </thead>
              <tbody>
                {dayData.cas.map((c, i) => (
                  <tr key={c.id}>
                    <td>{c.title_en}</td>
                    <td>{c.category}</td>
                    {articleStatus.length > 0 && (
                      <td>
                        {articleStatus[i]?.status === 'loading' && <span className="field-hint">Generating…</span>}
                        {articleStatus[i]?.status === 'idle' && <span className="field-hint">Pending</span>}
                        {articleStatus[i]?.status === 'success' && (
                          <span style={{ color: '#1f9d5a', fontWeight: 600, fontSize: 13 }}>✓ Done</span>
                        )}
                        {articleStatus[i]?.status === 'error' && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ color: '#d64545', fontWeight: 600, fontSize: 13 }} title={articleStatus[i].error}>
                              Failed
                            </span>
                            <button
                              type="button"
                              className="btn btn-ghost"
                              style={{ padding: '4px 10px', fontSize: 12 }}
                              onClick={() => handleRetryArticle(i)}
                              disabled={anyLoading}
                            >
                              Retry
                            </button>
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {anyLoading && <p className="field-hint">{generateProgress}</p>}
          {!anyLoading && failedCount > 0 && (
            <div className="alert alert-error">
              {failedCount} article{failedCount === 1 ? '' : 's'} failed to generate — retry individually above, or
              retry all failed at once.
            </div>
          )}
          {generateError && (
            <div className="alert alert-error" style={{ whiteSpace: 'pre-wrap' }}>
              {generateError}
            </div>
          )}

          <div className="form-actions">
            <button type="button" className="btn btn-primary" onClick={handleGenerateQb} disabled={anyLoading}>
              {generating ? 'Generating…' : 'Generate Question Bank'}
            </button>
            {!anyLoading && failedCount > 0 && (
              <button type="button" className="btn btn-ghost" onClick={handleRetryFailed}>
                Retry Failed ({failedCount})
              </button>
            )}
          </div>
        </section>
      )}

      {questions.length > 0 && (
        <section className="result-card">
          <div className="result-toolbar">
            <h3>Question Bank — {dateDMY} ({questions.length} questions)</h3>
            <div className="result-actions">
              <div className="qb-lang-toggle">
                {LANGS.map((l) => (
                  <button
                    key={l.value}
                    type="button"
                    className={`qb-lang-btn${previewLang === l.value ? ' qb-lang-btn--active' : ''}`}
                    onClick={() => setPreviewLang(l.value)}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
              <button type="button" className="btn btn-primary" onClick={handleDownloadDayJson}>
                Download JSON
              </button>
            </div>
          </div>

          <p className="field-hint" style={{ padding: '0 20px', marginTop: 12 }}>
            {Object.entries(typeCounts)
              .map(([type, count]) => `${count} ${TYPE_LABELS[type] || type}`)
              .join(' · ')}
          </p>

          <div className="qb-question-list">
            {questions.map((q) => (
              <article key={q.qid} className="qb-question-card">
                <div className="qb-question-header">
                  <span className="qb-qid">#{q.qid}</span>
                  <span className={`qb-badge ${TYPE_CLASS[q.type] || ''}`}>{TYPE_LABELS[q.type] || q.type}</span>
                  <span className={`qb-badge ${DIFFICULTY_CLASS[q.difficulty] || ''}`}>{q.difficulty}</span>
                </div>

                <p className="qb-question-text">{q.question?.[previewLang]}</p>

                <div className="qb-options-grid">
                  {OPTION_LETTERS.map((letter) => {
                    const isCorrect = q.answer === letter
                    const text = q.options?.[previewLang]?.[letter]
                    if (!text) return null
                    return (
                      <div key={letter} className={`qb-option${isCorrect ? ' qb-option--correct' : ''}`}>
                        <span className="qb-option-letter">{letter}</span>
                        <span className="qb-option-text">{text}</span>
                        {isCorrect && <span className="qb-option-check">✓</span>}
                      </div>
                    )
                  })}
                </div>

                {q.explanation?.[previewLang] && (
                  <p className="qb-explanation">
                    <strong>Explanation:</strong> {q.explanation[previewLang]}
                  </p>
                )}
                {q.tip?.[previewLang] && (
                  <p className="qb-tip">
                    <strong>💡 Tip:</strong> {q.tip[previewLang]}
                  </p>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      {gameRootPreview && questions.length > 0 && gameMergedMonthJson && (
        <section className="result-card">
          <div className="result-toolbar">
            <h3>Cagame Game files — {dateDMY}</h3>
            <div className="result-actions">
              <button type="button" className="btn btn-ghost" onClick={handleDownloadGameZip}>
                Download All (ZIP)
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handlePublishGameFiles}
                disabled={publishingGame}
              >
                {publishingGame ? 'Publishing…' : 'Publish to Spaces'}
              </button>
            </div>
          </div>

          <p className="field-hint" style={{ padding: '0 20px' }}>
            Publishes gameRoot.json (a second, independent root/index also served from {CA_GAME_BASE}/) alongside{' '}
            {dateDMY}.zip and {monthKey}.zip — the same day/month zip files the Cagame feature uses, so this and
            that feature must be published together, in order, to avoid overwriting each other's content.
          </p>

          {gameRootLoading && (
            <p className="field-hint" style={{ padding: '0 20px' }}>
              Loading gameRoot.json…
            </p>
          )}
          {gameRootError && (
            <div className="alert alert-error" style={{ margin: '0 20px' }}>
              {gameRootError}
            </div>
          )}
          {gameMonthLoading && (
            <p className="field-hint" style={{ padding: '0 20px' }}>
              Loading existing {monthKey}.zip…
            </p>
          )}
          {gameMonthError && (
            <p className="field-hint" style={{ padding: '0 20px' }}>
              Couldn't load existing {monthKey}.zip ({gameMonthError}) — treating as a new month.
            </p>
          )}

          {publishGameError && (
            <div className="alert alert-error" style={{ margin: '16px 20px 0' }}>
              {publishGameError}
            </div>
          )}

          {publishGameResults && (
            <div style={{ padding: '16px 20px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {publishGameResults.map((r) => (
                <div key={r.key} className={`alert ${r.success ? 'alert-success' : 'alert-error'}`}>
                  {r.key} — {r.success ? 'uploaded' : r.error}
                </div>
              ))}
              {purgeGameStatus && (
                <div className={`alert ${purgeGameStatus.success ? 'alert-success' : 'alert-error'}`}>
                  CDN cache purge — {purgeGameStatus.success ? 'succeeded' : purgeGameStatus.error}
                </div>
              )}
            </div>
          )}

          <div className="result-toolbar">
            <h3>Month JSON — {monthKey}.zip</h3>
            <span className="field-hint">{gameMergedMonthJson.questions.length} questions</span>
          </div>
          <pre className="json-preview">{JSON.stringify(gameMergedMonthJson, null, 2)}</pre>

          <div className="result-toolbar">
            <h3>gameRoot.json{gameRootPreview.isNewMonth ? ' — new month entry' : ''}</h3>
          </div>
          <p className="field-hint" style={{ padding: '0 20px' }}>
            {gameRootPreview.isNewMonth
              ? `Will create a new month entry: "${gameRootPreview.root.downloads[gameRootPreview.monthEntryIndex].title}".`
              : `Will update "${gameRootPreview.root.downloads[gameRootPreview.monthEntryIndex].title}" to ${
                  gameRootPreview.root.downloads[gameRootPreview.monthEntryIndex].desc
                }.`}
          </p>
          <pre className="json-preview">{JSON.stringify(gameRootPreview.root, null, 2)}</pre>
        </section>
      )}
    </div>
  )
}

export default CaQbParser
