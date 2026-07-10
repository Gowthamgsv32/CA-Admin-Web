import { useEffect, useMemo, useState } from 'react'
import {
  CA_ROOT_URL,
  CA_SHEET_ID,
  CURRENT_AFFAIRS_BASE,
  DAILY_BYTES_BASE,
  ROOT_URL,
  VER_FILE_URL,
  WORKER_URL,
} from '../config/api'
import { bytesToBase64, createZip } from '../utils/zip'
import { downloadBlob } from '../utils/download'
import {
  buildNextRoot,
  buildNextVerFile,
  isoToDMY,
  mergeMonthJson,
  monthKeyFromDMY,
} from '../utils/dailyBytesPublish'
import { buildSheetCsvUrl, parseCaSheet } from '../utils/caSheetParser'
import { buildNextCaRoot } from '../utils/caPublish'

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

function currentMonthName() {
  return new Date().toLocaleString('en-US', { month: 'long' })
}

// Sorts dd-mm-yyyy strings chronologically by rewriting to yyyymmdd for comparison.
function dmyToComparable(dmy) {
  const [d, m, y] = dmy.split('-')
  return `${y}${m}${d}`
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

  const [sheetTabName, setSheetTabName] = useState(currentMonthName)
  const [sheetHasHeader, setSheetHasHeader] = useState(true)
  const [sheetVersion, setSheetVersion] = useState('')
  const [sheetLoading, setSheetLoading] = useState(false)
  const [sheetError, setSheetError] = useState('')
  const [sheetParsed, setSheetParsed] = useState(null)
  const [sheetShowJson, setSheetShowJson] = useState(false)

  const [caRoot, setCaRoot] = useState(null)
  const [caRootLoading, setCaRootLoading] = useState(false)
  const [caRootError, setCaRootError] = useState('')
  const [genDate, setGenDate] = useState('')

  const [remoteMonthQuestions, setRemoteMonthQuestions] = useState(null)
  const [remoteMonthLoading, setRemoteMonthLoading] = useState(false)
  const [remoteMonthError, setRemoteMonthError] = useState('')

  const [generatedQuestions, setGeneratedQuestions] = useState([])
  const [questionsLoading, setQuestionsLoading] = useState(false)
  const [questionsError, setQuestionsError] = useState('')

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

  async function handleFetchSheet() {
    const tabName = sheetTabName.trim()
    setSheetError('')
    setSheetParsed(null)

    if (!tabName) {
      setSheetError('Enter a tab name (e.g. "July").')
      return
    }

    setSheetLoading(true)
    try {
      const url = buildSheetCsvUrl(CA_SHEET_ID, tabName)
      const res = await fetch(url, { cache: 'no-store' })
      if (!res.ok) {
        throw new Error(
          `Failed to fetch tab "${tabName}" (${res.status}). Make sure the sheet is shared as ` +
            '"Anyone with the link can view" and the tab name matches exactly.'
        )
      }
      const csvText = await res.text()
      const result = parseCaSheet(csvText, { version: Number(sheetVersion) || 0, hasHeader: sheetHasHeader })
      if (result.cas.length === 0) {
        throw new Error('No valid rows found. Check the tab name and that dates are in dd-mm-yyyy format.')
      }
      setSheetParsed(result)
    } catch (err) {
      setSheetError(err.message)
    } finally {
      setSheetLoading(false)
    }
  }

  function handleDownloadSheetJson() {
    if (!sheetParsed) return
    const json = JSON.stringify({ cas: sheetParsed.cas, questions: sheetParsed.questions }, null, 2)
    downloadBlob(json, `${sheetTabName.trim() || 'ca'}.json`, 'application/json')
  }

  const genDateOptions = useMemo(() => {
    if (!sheetParsed) return []
    const set = new Set(sheetParsed.cas.map((c) => c.date))
    return [...set].sort((a, b) => dmyToComparable(b).localeCompare(dmyToComparable(a)))
  }, [sheetParsed])

  useEffect(() => {
    if (genDateOptions.length > 0 && !genDateOptions.includes(genDate)) {
      setGenDate(genDateOptions[0])
    }
  }, [genDateOptions]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleLoadCaRoot() {
    setCaRootError('')
    setCaRootLoading(true)
    try {
      const res = await fetch(CA_ROOT_URL, { cache: 'no-store' })
      if (!res.ok) throw new Error(`Failed to load root.json (${res.status})`)
      setCaRoot(await res.json())
    } catch (err) {
      setCaRootError(err.message)
    } finally {
      setCaRootLoading(false)
    }
  }

  useEffect(() => {
    handleLoadCaRoot()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // The sheet stamps each cas row with a "ver" (used for client-side cache
  // busting). Publishing bumps both root.ver and the month's av_mos entry ver
  // by 1, so the stamp should target that upcoming version, not the currently
  // live one — e.g. av_mos[0].ver "10" -> next ver 11 -> stamp 11000.
  useEffect(() => {
    if (!caRoot) return
    const nextMonthVer = (Number(caRoot.av_mos?.[0]?.ver) || 0) + 1
    setSheetVersion(String(nextMonthVer * 1000))
  }, [caRoot])

  const dayJsonPreview = useMemo(() => {
    if (!sheetParsed || !genDate) return null
    return { cas: sheetParsed.cas.filter((c) => c.date === genDate), questions: generatedQuestions }
  }, [sheetParsed, genDate, generatedQuestions])

  const monthJsonPreview = useMemo(() => {
    if (!sheetParsed) return null
    return { cas: sheetParsed.cas, questions: [...(remoteMonthQuestions || []), ...generatedQuestions] }
  }, [sheetParsed, remoteMonthQuestions, generatedQuestions])

  const genMonthKey = useMemo(() => (genDate ? monthKeyFromDMY(genDate) : ''), [genDate])

  // A newly generated batch only makes sense for the date/month it was
  // generated for — switching either invalidates it and re-fetches the
  // existing month's questions so qid numbering starts from the right place.
  useEffect(() => {
    setGeneratedQuestions([])
  }, [genDate])

  useEffect(() => {
    if (!genMonthKey) return
    setRemoteMonthError('')
    setRemoteMonthLoading(true)
    fetch(`${CURRENT_AFFAIRS_BASE}/${genMonthKey}.json`, { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) {
          if (res.status === 404 || res.status === 403) return { questions: [] }
          throw new Error(`Failed to load ${genMonthKey}.json (${res.status})`)
        }
        return res.json()
      })
      .then((data) => setRemoteMonthQuestions(Array.isArray(data.questions) ? data.questions : []))
      .catch((err) => {
        setRemoteMonthError(err.message)
        setRemoteMonthQuestions([])
      })
      .finally(() => setRemoteMonthLoading(false))
  }, [genMonthKey])

  async function handleGenerateQuestions() {
    setQuestionsError('')

    if (!dayJsonPreview || dayJsonPreview.cas.length === 0) {
      setQuestionsError('No cas entries for the selected date.')
      return
    }

    setQuestionsLoading(true)
    try {
      const res = await fetch(`${WORKER_URL}/generate-ca-questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cas: dayJsonPreview.cas.map((c) => ({
            title_en: c.title_en,
            desc_en: c.desc_en,
            category: c.category,
            date: c.date,
          })),
        }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || `Request failed (${res.status})`)

      const expected = dayJsonPreview.cas.length * 2
      if (!Array.isArray(result.data) || result.data.length !== expected) {
        throw new Error(`Expected ${expected} questions, got ${result.data?.length ?? 0}.`)
      }

      const dateDigits = genDate.replace(/-/g, '')
      const startSeq = (remoteMonthQuestions?.length || 0) + 1
      const stamped = result.data.map((q, i) => ({
        qid: Number(`${dateDigits}${startSeq + i}`),
        ...q,
      }))
      setGeneratedQuestions(stamped)
    } catch (err) {
      setQuestionsError(err.message)
    } finally {
      setQuestionsLoading(false)
    }
  }

  const rootPreview = useMemo(() => {
    if (!caRoot || !genDate || !monthJsonPreview) return null
    return buildNextCaRoot({
      currentRoot: caRoot,
      selectedDateDMY: genDate,
      monthCasCount: monthJsonPreview.cas.length,
      monthQuestionsCount: monthJsonPreview.questions.length,
      baseUrl: CURRENT_AFFAIRS_BASE,
    })
  }, [caRoot, genDate, monthJsonPreview])

  function handleDownloadDayJson() {
    if (!dayJsonPreview || !genDate) return
    downloadBlob(JSON.stringify(dayJsonPreview, null, 2), `${genDate}.json`, 'application/json')
  }

  function handleDownloadMonthJson() {
    if (!monthJsonPreview || !genMonthKey) return
    downloadBlob(JSON.stringify(monthJsonPreview, null, 2), `${genMonthKey}.json`, 'application/json')
  }

  function handleDownloadRootJson() {
    if (!rootPreview) return
    downloadBlob(JSON.stringify(rootPreview.root, null, 2), 'root.json', 'application/json')
  }

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
        <h3>Fetch from Google Sheet</h3>
        <p className="field-hint">
          Reads a month tab directly from the Current Affairs content sheet and parses it into
          the same {`{ cas, questions }`} shape the desktop tool used to produce from the .tsv file.
        </p>

        <div className="form-grid">
          <label className="field">
            <span>Tab name</span>
            <input
              type="text"
              value={sheetTabName}
              onChange={(e) => setSheetTabName(e.target.value)}
              placeholder="e.g. July"
            />
          </label>
          <label className="field">
            <span>Version (ver)</span>
            <input type="text" value={sheetVersion} onChange={(e) => setSheetVersion(e.target.value)} />
            <span className="field-hint">
              {caRootLoading && 'Loading root.json…'}
              {caRootError && `Couldn't load root.json: ${caRootError}`}
              {caRoot &&
                !caRootLoading &&
                `Next av_mos[0].ver (${caRoot.av_mos?.[0]?.ver} + 1) × 1000`}
            </span>
          </label>
          <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={sheetHasHeader}
              onChange={(e) => setSheetHasHeader(e.target.checked)}
            />
            <span>First row is a header</span>
          </label>
        </div>

        {sheetError && <div className="alert alert-error">{sheetError}</div>}

        <div className="form-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleFetchSheet}
            disabled={sheetLoading || caRootLoading}
          >
            {sheetLoading ? 'Fetching…' : 'Fetch & Parse'}
          </button>
        </div>
      </section>

      {sheetParsed && (
        <section className="result-card">
          <div className="result-toolbar">
            <h3>Parsed preview — {sheetParsed.cas.length} entries</h3>
            <div className="result-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setSheetShowJson((v) => !v)}>
                {sheetShowJson ? 'Show table' : 'Show raw JSON'}
              </button>
              <button type="button" className="btn btn-primary" onClick={handleDownloadSheetJson}>
                Download JSON
              </button>
            </div>
          </div>

          {sheetParsed.skipped > 0 && (
            <div style={{ padding: '0 20px', marginTop: 16 }}>
              <div className="alert alert-error">
                Skipped {sheetParsed.skipped} row{sheetParsed.skipped === 1 ? '' : 's'} with a missing or
                malformed date.
              </div>
            </div>
          )}

          {sheetShowJson ? (
            <pre className="json-preview">
              {JSON.stringify({ cas: sheetParsed.cas, questions: sheetParsed.questions }, null, 2)}
            </pre>
          ) : (
            <div className="ca-table-wrap">
              <table className="ca-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Date</th>
                    <th>Category</th>
                    <th>Title (EN)</th>
                    <th>Title (HI)</th>
                    <th>Title (TA)</th>
                  </tr>
                </thead>
                <tbody>
                  {sheetParsed.cas.map((c) => (
                    <tr key={c.id}>
                      <td>{c.id}</td>
                      <td>{c.date}</td>
                      <td>{c.category}</td>
                      <td>{c.title_en}</td>
                      <td>{c.title_hi}</td>
                      <td>{c.title_ta}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {sheetParsed && (
        <section className="form-card">
          <h3>Generate CA files</h3>
          <p className="field-hint">
            Builds the day, month, and root JSON files from the parsed sheet data above, against the live
            root.json on Spaces.
          </p>

          <div className="form-grid">
            <label className="field">
              <span>Day</span>
              <select value={genDate} onChange={(e) => setGenDate(e.target.value)}>
                {genDateOptions.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {remoteMonthLoading && <p className="field-hint">Loading existing {genMonthKey}.json questions…</p>}
          {remoteMonthError && (
            <p className="field-hint">
              Couldn't load existing {genMonthKey}.json ({remoteMonthError}) — treating as 0 existing questions.
            </p>
          )}
          {remoteMonthQuestions && !remoteMonthLoading && genDate && (
            <p className="field-hint">
              {remoteMonthQuestions.length} existing question{remoteMonthQuestions.length === 1 ? '' : 's'} in{' '}
              {genMonthKey}.json · next qid starts at {genDate.replace(/-/g, '')}
              {remoteMonthQuestions.length + 1}
            </p>
          )}

          {questionsError && <div className="alert alert-error">{questionsError}</div>}

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleGenerateQuestions}
              disabled={questionsLoading || remoteMonthLoading || !dayJsonPreview || dayJsonPreview.cas.length === 0}
            >
              {questionsLoading
                ? 'Generating…'
                : `Generate Questions (${dayJsonPreview ? dayJsonPreview.cas.length * 2 : 0})`}
            </button>
            {generatedQuestions.length > 0 && (
              <span className="field-hint">
                {generatedQuestions.length} generated for {genDate}
              </span>
            )}
          </div>

          {caRootLoading && <p className="field-hint">Loading current root.json…</p>}
          {caRootError && <div className="alert alert-error">{caRootError}</div>}
          {caRoot && !caRootLoading && (
            <p className="field-hint">
              Live date {caRoot.date} · root ver {caRoot.ver}
            </p>
          )}

          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={handleLoadCaRoot} disabled={caRootLoading}>
              Refresh root.json
            </button>
          </div>
        </section>
      )}

      {rootPreview && dayJsonPreview && monthJsonPreview && (
        <section className="result-card">
          <div className="result-toolbar">
            <h3>Day JSON — {genDate}.json</h3>
            <div className="result-actions">
              <span className="field-hint">{dayJsonPreview.cas.length} entries</span>
              <button type="button" className="btn btn-ghost" onClick={handleDownloadDayJson}>
                Download
              </button>
            </div>
          </div>
          <pre className="json-preview">{JSON.stringify(dayJsonPreview, null, 2)}</pre>

          <div className="result-toolbar">
            <h3>Month JSON — {genMonthKey}.json</h3>
            <div className="result-actions">
              <span className="field-hint">
                {monthJsonPreview.cas.length} cas · {monthJsonPreview.questions.length} questions
              </span>
              <button type="button" className="btn btn-ghost" onClick={handleDownloadMonthJson}>
                Download
              </button>
            </div>
          </div>
          <pre className="json-preview">{JSON.stringify(monthJsonPreview, null, 2)}</pre>

          <div className="result-toolbar">
            <h3>Root JSON{rootPreview.isNewMonth ? ' — new month entry' : ''}</h3>
            <div className="result-actions">
              <button type="button" className="btn btn-primary" onClick={handleDownloadRootJson}>
                Download
              </button>
            </div>
          </div>
          <p className="field-hint" style={{ padding: '0 20px' }}>
            {rootPreview.isNewMonth
              ? `Will create a new month entry: "${rootPreview.root.av_mos[rootPreview.monthEntryIndex].title}".`
              : `Will update "${rootPreview.root.av_mos[rootPreview.monthEntryIndex].title}" to ${
                  rootPreview.root.av_mos[rootPreview.monthEntryIndex].desc
                }.`}
          </p>
          <pre className="json-preview">{JSON.stringify(rootPreview.root, null, 2)}</pre>
        </section>
      )}

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
