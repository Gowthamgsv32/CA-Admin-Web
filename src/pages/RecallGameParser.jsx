import { useEffect, useMemo, useState } from 'react'
import { CURRENT_AFFAIRS_BASE } from '../config/api'
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
  const [selectedItems, setSelectedItems] = useState({})

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
    () => currentCategoryItems.filter((item) => selectedItems[item.id]).map((item) => item.id),
    [currentCategoryItems, selectedItems]
  )

  function handleCategorySelectionChange(newIds) {
    setSelectedItems((prev) => {
      const next = { ...prev }
      for (const item of currentCategoryItems) {
        delete next[item.id]
      }
      const newIdSet = new Set(newIds)
      for (const item of currentCategoryItems) {
        if (newIdSet.has(item.id)) next[item.id] = item
      }
      return next
    })
  }

  function removeSelectedItem(id) {
    setSelectedItems((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  function clearAllSelected() {
    setSelectedItems({})
  }

  const selectedList = Object.values(selectedItems)

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
        </div>
      </div>
    </div>
  )
}

export default RecallGameParser
