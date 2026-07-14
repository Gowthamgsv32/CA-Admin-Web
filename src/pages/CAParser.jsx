import { useEffect, useMemo, useState } from 'react'
import { CA_ROOT_URL, CA_SHEET_ID, CURRENT_AFFAIRS_BASE, ROOT_URL, VER_FILE_URL, WORKER_URL } from '../config/api'
import { downloadBlob } from '../utils/download'
import { createZip, bytesToBase64 } from '../utils/zip'
import { isoToDMY, monthKeyFromDMY } from '../utils/dailyBytesPublish'
import { buildSheetCsvUrl, parseCaSheet } from '../utils/caSheetParser'
import { buildNextCaRoot, buildMonthZipBytes } from '../utils/caPublish'

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

function currentMonthName() {
  return new Date().toLocaleString('en-US', { month: 'long' })
}

function dmyToISO(dmy) {
  const [d, m, y] = dmy.split('-')
  return `${y}-${m}-${d}`
}

function CAParser() {
  const [currentRoot, setCurrentRoot] = useState(null)
  const [currentVerFile, setCurrentVerFile] = useState(null)
  const [loadingCurrent, setLoadingCurrent] = useState(true)
  const [currentError, setCurrentError] = useState('')

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
  const [genDate, setGenDate] = useState(() => isoToDMY(todayISO()))

  const [remoteMonthQuestions, setRemoteMonthQuestions] = useState(null)
  const [remoteMonthLoading, setRemoteMonthLoading] = useState(false)
  const [remoteMonthError, setRemoteMonthError] = useState('')

  const [generatedQuestions, setGeneratedQuestions] = useState([])
  const [questionsLoading, setQuestionsLoading] = useState(false)
  const [questionsError, setQuestionsError] = useState('')

  const [publishingCa, setPublishingCa] = useState(false)
  const [publishCaError, setPublishCaError] = useState('')
  const [publishCaResults, setPublishCaResults] = useState(null)

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
      const url = buildSheetCsvUrl(CA_SHEET_ID, "1156533116")
      console.log('Fetching sheet CSV from', url)
      const res = await fetch(url, { cache: 'no-store' })
      if (!res.ok) {
        throw new Error(
          `Failed to fetch tab "${tabName}" (${res.status}). Make sure the sheet is shared as ` +
            '"Anyone with the link can view" and the tab name matches exactly.'
        )
      }
      const csvText = await res.text()
      // console.log(csvText)
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

  // The month json url/key is always derived from whichever date is picked —
  // pick a different date and everything below (existing question count,
  // month file fetched, root av_mos entry updated) follows automatically.
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

  // Recomputes automatically whenever monthJsonPreview changes (e.g. right
  // after generating questions), so the root av_mos entry's cas/questions
  // counts in its "desc" always reflect the current month data.
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

  function handleDownloadAllZip() {
    if (!rootPreview || !dayJsonPreview || !monthJsonPreview || !genDate || !genMonthKey) return
    const monthZipBytes = buildMonthZipBytes(monthJsonPreview, genMonthKey)
    const files = [
      { name: 'root.json', data: new TextEncoder().encode(JSON.stringify(rootPreview.root, null, 2)) },
      { name: `${genDate}.json`, data: new TextEncoder().encode(JSON.stringify(dayJsonPreview, null, 2)) },
      { name: `${genMonthKey}.json`, data: new TextEncoder().encode(JSON.stringify(monthJsonPreview, null, 2)) },
      { name: `${genMonthKey}.zip`, data: monthZipBytes },
    ]
    downloadBlob(createZip(files), `CurrentAffairs-${genDate}.zip`, 'application/zip')
  }

  async function handlePublishCaFiles() {
    setPublishCaError('')
    setPublishCaResults(null)

    if (!rootPreview || !dayJsonPreview || !monthJsonPreview || !genDate || !genMonthKey) {
      setPublishCaError('Generate the files first.')
      return
    }

    setPublishingCa(true)
    try {
      const monthZipBytes = buildMonthZipBytes(monthJsonPreview, genMonthKey)

      const files = [
        { key: 'CurrentAffairs/root.json', contentType: 'application/json', body: JSON.stringify(rootPreview.root) },
        {
          key: `CurrentAffairs/${genDate}.json`,
          contentType: 'application/json',
          body: JSON.stringify(dayJsonPreview),
        },
        {
          key: `CurrentAffairs/${genMonthKey}.json`,
          contentType: 'application/json',
          body: JSON.stringify(monthJsonPreview),
        },
        {
          key: `CurrentAffairs/${genMonthKey}.zip`,
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
      setPublishCaResults(result.results)

      if (result.results?.every((r) => r.success)) {
        setCaRoot(rootPreview.root)
        setRemoteMonthQuestions((prev) => [...(prev || []), ...generatedQuestions])
        setGeneratedQuestions([])
      }
    } catch (err) {
      setPublishCaError(`Publish failed: ${err.message}`)
    } finally {
      setPublishingCa(false)
    }
  }

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
                <div>
                  Skipped {sheetParsed.skipped} row{sheetParsed.skipped === 1 ? '' : 's'} with a missing or
                  malformed date (column A value below — search for it in the sheet).
                </div>
                {sheetParsed.skippedSamples?.length > 0 && (
                  <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
                    {sheetParsed.skippedSamples.map((s, i) => (
                      <li key={`${s.serial}-${i}`}>
                        Col A: {s.serial} — "{s.title}" — date column: {s.rawDate}
                      </li>
                    ))}
                    {sheetParsed.skipped > sheetParsed.skippedSamples.length && (
                      <li>…and {sheetParsed.skipped - sheetParsed.skippedSamples.length} more</li>
                    )}
                  </ul>
                )}
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
              <input
                type="date"
                value={dmyToISO(genDate)}
                onChange={(e) => setGenDate(isoToDMY(e.target.value))}
              />
            </label>
          </div>

          {dayJsonPreview && dayJsonPreview.cas.length === 0 && (
            <p className="field-hint">No cas entries in the parsed sheet for this date.</p>
          )}

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
            <h3>Generated files — {genDate}</h3>
            <div className="result-actions">
              <button type="button" className="btn btn-ghost" onClick={handleDownloadAllZip}>
                Download All (ZIP)
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handlePublishCaFiles}
                disabled={publishingCa}
              >
                {publishingCa ? 'Publishing…' : 'Publish to Spaces'}
              </button>
            </div>
          </div>

          {publishCaError && (
            <div className="alert alert-error" style={{ margin: '16px 20px 0' }}>
              {publishCaError}
            </div>
          )}

          {publishCaResults && (
            <div style={{ padding: '16px 20px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {publishCaResults.map((r) => (
                <div key={r.key} className={`alert ${r.success ? 'alert-success' : 'alert-error'}`}>
                  {r.key} — {r.success ? 'uploaded' : r.error}
                </div>
              ))}
            </div>
          )}

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
    </div>
  )
}

export default CAParser
