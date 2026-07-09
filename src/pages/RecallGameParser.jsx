import { useEffect, useMemo, useState } from 'react'
import {
  CURRENT_AFFAIRS_BASE,
  RECALL_GAME_BASE,
  RECALL_GAME_ROOT_URL,
  RECALL_GAME_USED_ARTICLES_URL,
  WORKER_URL,
} from '../config/api'
import { isoToDMY, monthKeyFromDMY } from '../utils/dailyBytesPublish'
import { buildTopicsJson, loadStoredRecallVersion, saveStoredRecallVersion } from '../utils/recallGameJson'
import { buildNextRecallRoot, mergeTopicsMonthJson } from '../utils/recallGamePublish'
import { mergeUsedArticleIds } from '../utils/recallGameUsage'
import { bytesToBase64, createZip } from '../utils/zip'
import { downloadBlob } from '../utils/download'
import MultiSelectDropdown from '../components/MultiSelectDropdown'

function zipFileFromMonthJson(monthKey, monthJson) {
  return createZip([
    { name: `${monthKey}.json`, data: new TextEncoder().encode(JSON.stringify(monthJson)) },
  ])
}

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
  const [monthJsonRecall, setMonthJsonRecall] = useState(null)
  const [monthJsonExpanded, setMonthJsonExpanded] = useState(true)
  const [zipBytesRecall, setZipBytesRecall] = useState(null)

  const [currentRecallRoot, setCurrentRecallRoot] = useState(null)
  const [usedArticlesJson, setUsedArticlesJson] = useState(null)
  const [loadingRecallRoot, setLoadingRecallRoot] = useState(true)
  const [recallRootError, setRecallRootError] = useState('')

  const [publishing, setPublishing] = useState(false)
  const [publishStatus, setPublishStatus] = useState(null)

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

  async function loadRecallServerState() {
    setLoadingRecallRoot(true)
    setRecallRootError('')
    try {
      const [rootRes, usedRes] = await Promise.all([
        fetch(RECALL_GAME_ROOT_URL, { cache: 'no-store' }),
        fetch(RECALL_GAME_USED_ARTICLES_URL, { cache: 'no-store' }),
      ])

      if (!rootRes.ok) throw new Error(`Failed to load recall-root.json (${rootRes.status})`)
      setCurrentRecallRoot(await rootRes.json())

      if (usedRes.ok) {
        setUsedArticlesJson(await usedRes.json())
      } else if (usedRes.status === 404) {
        setUsedArticlesJson({ ids: [] })
      } else {
        throw new Error(`Failed to load used-articles.json (${usedRes.status})`)
      }
    } catch (err) {
      setRecallRootError(err.message)
    } finally {
      setLoadingRecallRoot(false)
    }
  }

  useEffect(() => {
    loadRecallServerState()
  }, [])

  const usedArticleIds = useMemo(() => new Set(usedArticlesJson?.ids || []), [usedArticlesJson])

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

  const gameDateDMY = useMemo(() => (gameDate ? isoToDMY(gameDate) : ''), [gameDate])

  // Every selected article contributes exactly one topic, so the month's
  // running "N Questions available" count always advances by the current
  // selection size.
  const nextRootResult = useMemo(() => {
    if (!currentRecallRoot || !gameDateDMY) return null
    return buildNextRecallRoot({
      currentRoot: currentRecallRoot,
      selectedDateDMY: gameDateDMY,
      questionCount: selectedList.length,
      baseUrl: RECALL_GAME_BASE,
    })
  }, [currentRecallRoot, gameDateDMY, selectedList.length])

  async function handleGenerateTopics() {
    setGenerateError('')
    setTopicsJson(null)
    setMonthJsonRecall(null)
    setZipBytesRecall(null)
    setTopicsExpanded(true)
    setMonthJsonExpanded(true)
    setPublishStatus(null)

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

      setGenerateProgress('Merging with month data…')

      const dateDMY = isoToDMY(gameDate)
      const dayMonthKey = monthKeyFromDMY(dateDMY)
      const provisionalVer = loadStoredRecallVersion() + 1000
      const provisionalDay = buildTopicsJson({ dateDMY, ver: provisionalVer, generatedList })

      let currentMonthJson = null
      const monthRes = await fetch(`${RECALL_GAME_BASE}/${dayMonthKey}.json`, { cache: 'no-store' })
      if (monthRes.ok) {
        currentMonthJson = await monthRes.json()
      } else if (monthRes.status !== 404) {
        throw new Error(`Failed to load ${dayMonthKey}.json (${monthRes.status})`)
      }

      const { topics: mergedTopics, ver: finalVer } = mergeTopicsMonthJson({
        currentMonthJson,
        dayTopics: provisionalDay.topics,
        fallbackVer: provisionalVer,
      })

      const finalDayJson = {
        topics: provisionalDay.topics.map((entry) => ({ ...entry, ver: finalVer })),
      }
      const mergedMonthJson = { topics: mergedTopics }
      const zipData = zipFileFromMonthJson(dayMonthKey, mergedMonthJson)

      saveStoredRecallVersion(finalVer)

      setTopicsJson(finalDayJson)
      setMonthJsonRecall(mergedMonthJson)
      setZipBytesRecall(zipData)
    } catch (err) {
      setGenerateError(err.message)
    } finally {
      setGenerating(false)
      setGenerateProgress('')
    }
  }

  function handleDownloadTopicsJson() {
    if (!topicsJson || !gameDateDMY) return
    downloadBlob(JSON.stringify(topicsJson, null, 2), `${gameDateDMY}.json`, 'application/json')
  }

  function handleDownloadMonthJsonRecall() {
    if (!monthJsonRecall || !gameDateDMY) return
    downloadBlob(JSON.stringify(monthJsonRecall, null, 2), `${monthKeyFromDMY(gameDateDMY)}.json`, 'application/json')
  }

  function handleDownloadZipRecall() {
    if (!zipBytesRecall || !gameDateDMY) return
    downloadBlob(zipBytesRecall, `${monthKeyFromDMY(gameDateDMY)}.zip`, 'application/zip')
  }

  const publishReady = Boolean(nextRootResult && topicsJson && monthJsonRecall && zipBytesRecall && usedArticlesJson)

  function handleDownloadAllRecallFiles() {
    if (!publishReady) return
    const monthKey = monthKeyFromDMY(gameDateDMY)
    const nextUsedArticlesJson = mergeUsedArticleIds(usedArticlesJson, selectedList.map((item) => item.id))
    downloadBlob(JSON.stringify(nextRootResult.root, null, 2), 'recall-root.json', 'application/json')
    downloadBlob(JSON.stringify(topicsJson, null, 2), `${gameDateDMY}.json`, 'application/json')
    downloadBlob(zipBytesRecall, `${monthKey}.zip`, 'application/zip')
    downloadBlob(JSON.stringify(nextUsedArticlesJson, null, 2), 'used-articles.json', 'application/json')
  }

  async function handlePublishAllRecall() {
    setPublishStatus(null)

    if (!gameDateDMY) {
      setPublishStatus({ type: 'error', message: 'Please choose a date.' })
      return
    }
    if (!nextRootResult || !usedArticlesJson) {
      setPublishStatus({ type: 'error', message: 'Root file not ready — check Server State.' })
      return
    }
    if (!topicsJson || !monthJsonRecall || !zipBytesRecall) {
      setPublishStatus({ type: 'error', message: 'Click "Generate Recall Game JSON" first.' })
      return
    }

    setPublishing(true)
    try {
      const monthKey = monthKeyFromDMY(gameDateDMY)
      const nextUsedArticlesJson = mergeUsedArticleIds(usedArticlesJson, selectedList.map((item) => item.id))
      const files = [
        { key: 'Recall-Game/recall-root.json', body: JSON.stringify(nextRootResult.root) },
        { key: `Recall-Game/${gameDateDMY}.json`, body: JSON.stringify(topicsJson) },
        {
          key: `Recall-Game/${monthKey}.zip`,
          bodyBase64: bytesToBase64(zipBytesRecall),
          contentType: 'application/zip',
        },
        { key: 'Recall-Game/used-articles.json', body: JSON.stringify(nextUsedArticlesJson) },
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
        setPublishStatus({ type: 'success', message: `Published all 4 files for ${gameDateDMY}.` })
        await loadRecallServerState()
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
                {categories.map((c) => {
                  const usedCount = c.items.filter((item) => usedArticleIds.has(item.id)).length
                  return (
                    <option key={c.category} value={c.category}>
                      {c.category} ({c.items.length}{usedCount > 0 ? `, ${usedCount} already published` : ''})
                    </option>
                  )
                })}
              </select>
            </label>

            {selectedCategory && (
              <label className="field">
                <span>Articles</span>
                <MultiSelectDropdown
                  options={currentCategoryItems.map((item) => ({
                    value: item.id,
                    label: item.title_en,
                    used: usedArticleIds.has(item.id),
                  }))}
                  selectedValues={categorySelectedValues}
                  onChange={handleCategorySelectionChange}
                  placeholder="Select articles…"
                />
                <span className="field-hint">✓ Published = already turned into a recall game and uploaded.</span>
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

          <section className="form-card">
            <h3>Publish to Server</h3>
            <p className="field-hint">All 4 files must be ready before uploading with public access.</p>

            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: 'var(--text-muted)' }}>
              <li>{nextRootResult ? '✅' : '⬜'} Root file (recall-root.json)</li>
              <li>{topicsJson ? '✅' : '⬜'} Day JSON ({gameDateDMY || 'no date selected'})</li>
              <li>
                {zipBytesRecall ? '✅' : '⬜'} Month ZIP (
                {gameDateDMY ? `${monthKeyFromDMY(gameDateDMY)}.zip` : 'no date selected'})
              </li>
              <li>{usedArticlesJson ? '✅' : '⬜'} Used-articles registry (used-articles.json)</li>
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
                onClick={handleDownloadAllRecallFiles}
                disabled={!publishReady}
              >
                Download All 4 Files
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handlePublishAllRecall}
                disabled={!publishReady || publishing}
              >
                {publishing ? 'Uploading…' : 'Upload JSON'}
              </button>
            </div>
          </section>

          <section className="form-card">
            <h3>Server State</h3>

            {loadingRecallRoot && <p className="field-hint">Loading recall-root.json…</p>}
            {recallRootError && <div className="alert alert-error">{recallRootError}</div>}

            {!loadingRecallRoot && currentRecallRoot && (
              <>
                <p className="field-hint">
                  Root: v{currentRecallRoot.ver}, last updated {currentRecallRoot.date}
                  {nextRootResult && ` → v${nextRootResult.root.ver}, ${nextRootResult.root.date}`}
                </p>
                {currentRecallRoot.av_mos?.[0] && (
                  <p className="field-hint">
                    Latest month "{currentRecallRoot.av_mos[0].title}": {currentRecallRoot.av_mos[0].desc} (v
                    {currentRecallRoot.av_mos[0].ver})
                    {nextRootResult &&
                      ` → ${nextRootResult.root.av_mos[nextRootResult.monthEntryIndex].desc} (v${nextRootResult.root.av_mos[nextRootResult.monthEntryIndex].ver})`}
                  </p>
                )}
                {usedArticlesJson && (
                  <p className="field-hint">{usedArticlesJson.ids.length} source articles converted so far (all time).</p>
                )}
              </>
            )}

            <div className="form-actions">
              <button type="button" className="btn btn-ghost" onClick={loadRecallServerState} disabled={loadingRecallRoot}>
                Refresh
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
                    {usedArticleIds.has(item.id) && <span className="multiselect-used-badge">✓ Published</span>}
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

          {monthJsonRecall && (
            <section className="result-card">
              <div className="result-toolbar">
                <h3>Month JSON — {gameDateDMY && monthKeyFromDMY(gameDateDMY)}</h3>
                <div className="result-actions">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setMonthJsonExpanded((v) => !v)}
                    aria-expanded={monthJsonExpanded}
                  >
                    {monthJsonExpanded ? 'Collapse' : 'Expand'}
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={handleDownloadMonthJsonRecall}>
                    Download JSON
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={handleDownloadZipRecall} disabled={!zipBytesRecall}>
                    Download ZIP
                  </button>
                </div>
              </div>
              <p className="field-hint" style={{ padding: '0 20px 12px' }}>
                {monthJsonRecall.topics.length} total questions for {gameDateDMY && monthKeyFromDMY(gameDateDMY)}. Only the
                zip is uploaded to the server — this JSON is preview/download only.
              </p>
              {monthJsonExpanded && <pre className="json-preview">{JSON.stringify(monthJsonRecall, null, 2)}</pre>}
            </section>
          )}
        </div>
      </div>
    </div>
  )
}

export default RecallGameParser
