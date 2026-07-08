import { useEffect, useMemo, useState } from 'react'
import { CURRENT_AFFAIRS_BASE, WORKER_URL } from '../config/api'
import { isoToDMY } from '../utils/dailyBytesPublish'
import { buildTopicsJson, loadStoredRecallVersion, saveStoredRecallVersion } from '../utils/recallGameJson'
import { downloadBlob } from '../utils/download'
import MultiSelectDropdown from '../components/MultiSelectDropdown'

const MONTHS = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
]

function buildYearOptions() {
  const current = new Date().getFullYear()
  const years = []
  for (let y = current - 2; y <= current + 1; y++) years.push(String(y))
  return years
}

const YEARS = buildYearOptions()

function todayParts() {
  const now = new Date()
  return {
    month: String(now.getMonth() + 1).padStart(2, '0'),
    year: String(now.getFullYear()),
  }
}

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

function groupByCategory(cas) {
  const map = new Map()
  for (const item of cas) {
    const cat = item.category?.trim() || 'Uncategorized'
    if (!map.has(cat)) map.set(cat, [])
    map.get(cat).push(item)
  }
  return [...map.entries()]
    .map(([category, items]) => ({ category, items }))
    .sort((a, b) => a.category.localeCompare(b.category))
}

function RecallGameParser() {
  const initial = todayParts()
  const [month, setMonth] = useState(initial.month)
  const [year, setYear] = useState(initial.year)

  const [casData, setCasData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedItems, setSelectedItems] = useState([]) // ordered array, oldest selection first

  const [gameDate, setGameDate] = useState(todayISO)
  const [generating, setGenerating] = useState(false)
  const [generateProgress, setGenerateProgress] = useState('')
  const [generateError, setGenerateError] = useState('')
  const [topicsJson, setTopicsJson] = useState(null)
  const [topicsExpanded, setTopicsExpanded] = useState(true)

  const url = `${CURRENT_AFFAIRS_BASE}/${month}-${year}.json`

  function fetchCasData(isCancelled) {
    setLoading(true)
    setError('')
    setCasData(null)

    fetch(url, { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error(`No data found for ${month}-${year} (${res.status})`)
        return res.json()
      })
      .then((data) => {
        if (!isCancelled()) setCasData(data)
      })
      .catch((err) => {
        if (!isCancelled()) setError(err.message)
      })
      .finally(() => {
        if (!isCancelled()) setLoading(false)
      })
  }

  useEffect(() => {
    let cancelled = false
    setSelectedCategory('')
    fetchCasData(() => cancelled)

    return () => {
      cancelled = true
    }
    // Refetch whenever the selected month or year changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year])

  const categories = useMemo(() => (casData?.cas ? groupByCategory(casData.cas) : []), [casData])

  const currentCategoryItems = useMemo(
    () => categories.find((c) => c.category === selectedCategory)?.items || [],
    [categories, selectedCategory]
  )

  const categorySelectedValues = useMemo(
    () => currentCategoryItems.filter((item) => selectedItems.some((si) => si.id === item.id)).map((item) => item.id),
    [currentCategoryItems, selectedItems]
  )

  // Selections are kept in an ordered array (not keyed by id) because
  // article ids look like plain integers, and JS objects silently reorder
  // integer-like keys — which would scramble the batch order used below.
  function handleCategorySelectionChange(newIds) {
    setSelectedItems((prev) => {
      const withoutCategory = prev.filter((si) => !currentCategoryItems.some((item) => item.id === si.id))
      const newIdSet = new Set(newIds)
      const nowSelected = currentCategoryItems.filter((item) => newIdSet.has(item.id))
      return [...withoutCategory, ...nowSelected]
    })
  }

  function removeSelectedItem(id) {
    setSelectedItems((prev) => prev.filter((item) => item.id !== id))
  }

  function clearAllSelected() {
    setSelectedItems([])
  }

  const selectedList = selectedItems

  async function handleGenerateTopics() {
    setGenerateError('')
    setTopicsJson(null)
    setTopicsExpanded(true)

    if (selectedList.length === 0) {
      setGenerateError('Select at least one article first.')
      return
    }
    if (!gameDate) {
      setGenerateError('Please choose a date for this recall game.')
      return
    }

    setGenerating(true)
    try {
      const generatedList = []
      for (let i = 0; i < selectedList.length; i++) {
        const article = selectedList[i]
        setGenerateProgress(`Generating ${i + 1} of ${selectedList.length}…`)

        const res = await fetch(`${WORKER_URL}/generate-recall`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            article: {
              title_en: article.title_en,
              desc_en: article.desc_en,
              category: article.category,
              date: article.date,
            },
          }),
        })

        const result = await res.json()
        if (result.error) throw new Error(`"${article.title_en}": ${result.error}`)
        generatedList.push(result.data)
      }

      const dateDMY = isoToDMY(gameDate)
      const ver = loadStoredRecallVersion() + 1000
      const combined = buildTopicsJson({ dateDMY, ver, generatedList })
      saveStoredRecallVersion(ver)
      setTopicsJson(combined)
    } catch (err) {
      setGenerateError(err.message)
    } finally {
      setGenerating(false)
      setGenerateProgress('')
    }
  }

  function handleDownloadTopicsJson() {
    if (!topicsJson) return
    downloadBlob(JSON.stringify(topicsJson, null, 2), `${isoToDMY(gameDate)}-recall.json`, 'application/json')
  }

  return (
    <div className="page">
      <section className="welcome-card">
        <h2>Recall Game Parser</h2>
        <p>Pick a month and year, choose a category, then select the articles to build into a recall game.</p>
      </section>

      <div className="page-columns">
        <div className="page-col page-col-left">
          <section className="form-card">
            <div className="form-grid">
              <label className="field">
                <span>Month</span>
                <select value={month} onChange={(e) => setMonth(e.target.value)}>
                  {MONTHS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Year</span>
                <select value={year} onChange={(e) => setYear(e.target.value)}>
                  {YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <p className="field-hint">Source: {url}</p>

            {loading && <p className="field-hint">Loading Current Affairs for {month}-{year}…</p>}

            {error && (
              <div className="alert alert-error">
                {error}
                <div className="form-actions" style={{ marginTop: 10 }}>
                  <button type="button" className="btn btn-ghost" onClick={() => fetchCasData(() => false)}>
                    Retry
                  </button>
                </div>
              </div>
            )}

            {!loading && !error && casData && (
              <p className="field-hint">
                Loaded {casData.cas?.length || 0} articles across {categories.length} categories.
              </p>
            )}

            <label className="field">
              <span>Category</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                disabled={categories.length === 0}
              >
                <option value="">Select a category…</option>
                {categories.map((c) => (
                  <option key={c.category} value={c.category}>
                    {c.category} ({c.items.length})
                  </option>
                ))}
              </select>
            </label>

            {selectedCategory && (
              <label className="field">
                <span>Articles</span>
                <MultiSelectDropdown
                  options={currentCategoryItems.map((item) => ({ value: item.id, label: item.title_en }))}
                  selectedValues={categorySelectedValues}
                  onChange={handleCategorySelectionChange}
                  placeholder="Select articles…"
                />
              </label>
            )}
          </section>

          <section className="form-card">
            <h3>Generate Recall Game</h3>
            <p className="field-hint">
              Generates one recall card per selected article — {selectedList.length || 'no'} article
              {selectedList.length === 1 ? '' : 's'} selected.
            </p>

            <label className="field">
              <span>Date</span>
              <input type="date" value={gameDate} onChange={(e) => setGameDate(e.target.value)} />
            </label>

            {generateError && <div className="alert alert-error">{generateError}</div>}

            <div className="form-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleGenerateTopics}
                disabled={generating || selectedList.length === 0}
              >
                {generating ? generateProgress || 'Generating…' : 'Generate Recall Game JSON'}
              </button>
            </div>
          </section>
        </div>

        <div className="page-col page-col-right">
          <section className="result-card">
            <div className="result-toolbar">
              <h3>Selected Articles ({selectedList.length})</h3>
              {selectedList.length > 0 && (
                <div className="result-actions">
                  <button type="button" className="btn btn-ghost" onClick={clearAllSelected}>
                    Clear All
                  </button>
                </div>
              )}
            </div>

            {selectedList.length === 0 ? (
              <div className="empty-state" style={{ border: 'none', padding: '40px 20px' }}>
                <p>No articles selected yet — pick a category and select some titles.</p>
              </div>
            ) : (
              <div className="chip-list">
                {selectedList.map((item) => (
                  <span key={item.id} className="chip">
                    <span className="chip-category">{item.category || 'Uncategorized'}</span>
                    <span>{item.title_en}</span>
                    <button
                      type="button"
                      className="chip-remove"
                      onClick={() => removeSelectedItem(item.id)}
                      aria-label={`Remove ${item.title_en}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </section>

          {topicsJson && (
            <section className="result-card">
              <div className="result-toolbar">
                <h3>Recall Game JSON ({topicsJson.topics.length})</h3>
                <div className="result-actions">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setTopicsExpanded((v) => !v)}
                    aria-expanded={topicsExpanded}
                  >
                    {topicsExpanded ? 'Collapse' : 'Expand'}
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={handleDownloadTopicsJson}>
                    Download JSON
                  </button>
                </div>
              </div>
              {topicsExpanded && <pre className="json-preview">{JSON.stringify(topicsJson, null, 2)}</pre>}
            </section>
          )}
        </div>
      </div>
    </div>
  )
}

export default RecallGameParser
