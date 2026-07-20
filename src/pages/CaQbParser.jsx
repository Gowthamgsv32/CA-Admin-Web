import { useMemo, useState } from 'react'
import { CURRENT_AFFAIRS_BASE, WORKER_URL } from '../config/api'
import { isoToDMY } from '../utils/dailyBytesPublish'
import { downloadBlob } from '../utils/download'

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

  const [previewLang, setPreviewLang] = useState('en')

  const dateDMY = useMemo(() => (date ? isoToDMY(date) : ''), [date])

  async function handleFetchDay() {
    setDayError('')
    setDayData(null)
    setQuestions([])
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

  async function handleGenerateQb() {
    setGenerateError('')
    setQuestions([])

    if (!dayData?.cas?.length) {
      setGenerateError('Fetch a day with current affairs entries first.')
      return
    }

    const dateDigits = dateDMY.replace(/-/g, '')
    const collected = []

    setGenerating(true)
    try {
      for (let i = 0; i < dayData.cas.length; i++) {
        const article = dayData.cas[i]
        setGenerateProgress(`Generating ${i + 1} of ${dayData.cas.length}: ${article.title_en}`)

        const res = await fetch(`${WORKER_URL}/generate-ca-qb`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic: article.title_en, text: article.desc_en }),
        })
        const result = await res.json()
        if (!res.ok || result.error) {
          throw new Error(`"${article.title_en}": ${result.error || `Request failed (${res.status})`}`)
        }

        for (const q of result.data) {
          collected.push({ qid: String(`${dateDigits}${collected.length + 1}`), ...q })
        }
      }
      setQuestions(collected)
    } catch (err) {
      setGenerateError(err.message)
      setQuestions(collected) // keep whatever was generated before the failure
    } finally {
      setGenerating(false)
      setGenerateProgress('')
    }
  }

  function handleDownloadDayJson() {
    if (questions.length === 0) return
    downloadBlob(JSON.stringify(questions, null, 2), `${dateDMY}-qb.json`, 'application/json')
  }

  const typeCounts = useMemo(() => {
    const counts = {}
    for (const q of questions) counts[q.type] = (counts[q.type] || 0) + 1
    return counts
  }, [questions])

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
                </tr>
              </thead>
              <tbody>
                {dayData.cas.map((c) => (
                  <tr key={c.id}>
                    <td>{c.title_en}</td>
                    <td>{c.category}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {generating && <p className="field-hint">{generateProgress}</p>}
          {generateError && <div className="alert alert-error">{generateError}</div>}

          <div className="form-actions">
            <button type="button" className="btn btn-primary" onClick={handleGenerateQb} disabled={generating}>
              {generating ? 'Generating…' : 'Generate Question Bank'}
            </button>
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
    </div>
  )
}

export default CaQbParser
