import { useEffect, useMemo, useState } from 'react'
import { CA_SHEET_ID, WORKER_URL } from '../config/api'
import { isoToDMY } from '../utils/dailyBytesPublish'

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

function CaTranslateParser() {
  const [sheetTabs, setSheetTabs] = useState([])
  const [sheetTabsLoading, setSheetTabsLoading] = useState(true)
  const [sheetTabsError, setSheetTabsError] = useState('')
  const [selectedGid, setSelectedGid] = useState('')

  const [date, setDate] = useState(todayISO)

  // '' when idle, otherwise which button triggered the run — lets each
  // button show its own "Translating…" state while disabling both.
  const [translating, setTranslating] = useState('')
  const [translateError, setTranslateError] = useState('')
  const [translateResult, setTranslateResult] = useState(null)

  async function loadSheetTabs() {
    setSheetTabsError('')
    setSheetTabsLoading(true)
    try {
      const res = await fetch(`${WORKER_URL}/ca-sheet-tabs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetId: CA_SHEET_ID }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || `Request failed (${res.status})`)
      if (!Array.isArray(result.tabs) || result.tabs.length === 0) {
        throw new Error('No tabs found in the sheet.')
      }
      setSheetTabs(result.tabs)
      setSelectedGid(result.tabs[result.tabs.length - 1].gid) // default: last (most recent) tab
    } catch (err) {
      setSheetTabsError(err.message)
    } finally {
      setSheetTabsLoading(false)
    }
  }

  useEffect(() => {
    loadSheetTabs()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const selectedTab = useMemo(() => sheetTabs.find((t) => t.gid === selectedGid), [sheetTabs, selectedGid])

  async function runTranslate(mode) {
    setTranslateError('')
    setTranslateResult(null)

    if (!selectedTab) {
      setTranslateError('Select a tab first.')
      return
    }
    if (mode === 'day' && !date) {
      setTranslateError('Choose a date first.')
      return
    }

    setTranslating(mode)
    try {
      const res = await fetch(`${WORKER_URL}/ca-translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetId: CA_SHEET_ID,
          tabName: selectedTab.name,
          mode,
          date: mode === 'day' ? isoToDMY(date) : undefined,
        }),
      })
      const result = await res.json()
      if (!res.ok || result.error) throw new Error(result.error || `Request failed (${res.status})`)
      setTranslateResult(result)
    } catch (err) {
      setTranslateError(err.message)
    } finally {
      setTranslating('')
    }
  }

  return (
    <div className="page">
      <section className="welcome-card">
        <h2>CA Translate</h2>
        <p>
          Fills in missing Tamil, Hindi, and Malayalam titles/descriptions directly in the Current Affairs content
          sheet — translated from the English columns with Google Translate. Already-translated cells are left
          untouched.
        </p>
      </section>

      <section className="form-card">
        <h3>Select tab</h3>

        <div className="form-grid">
          <label className="field">
            <span>Tab</span>
            <select
              value={selectedGid}
              onChange={(e) => setSelectedGid(e.target.value)}
              disabled={sheetTabsLoading || sheetTabs.length === 0}
            >
              {sheetTabs.map((t) => (
                <option key={t.gid} value={t.gid}>
                  {t.name}
                </option>
              ))}
            </select>
            <span className="field-hint">
              {sheetTabsLoading && 'Loading sheet tabs…'}
              {sheetTabsError && `Couldn't load tabs: ${sheetTabsError}`}
            </span>
          </label>

          <label className="field">
            <span>Date (for "Translate This Date" only)</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
        </div>

        {translateError && (
          <div className="alert alert-error" style={{ whiteSpace: 'pre-wrap' }}>
            {translateError}
          </div>
        )}

        <div className="form-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => runTranslate('day')}
            disabled={!!translating || sheetTabsLoading}
          >
            {translating === 'day' ? 'Translating…' : 'Translate This Date'}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => runTranslate('tab')}
            disabled={!!translating || sheetTabsLoading}
          >
            {translating === 'tab' ? 'Translating…' : 'Translate Entire Tab (missing only)'}
          </button>
        </div>

        <p className="field-hint">
          Only fills in empty Tamil/Hindi/Malayalam title and description cells for rows with English content —
          writes straight back into the "{selectedTab?.name || '…'}" tab, nothing is downloaded or previewed first.
        </p>
      </section>

      {translateResult && (
        <section className="result-card">
          <div className="result-toolbar">
            <h3>Result</h3>
          </div>
          <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p className="field-hint">
              Scanned {translateResult.rowsScanned} row{translateResult.rowsScanned === 1 ? '' : 's'} · filled{' '}
              {translateResult.cellsFilled} cell{translateResult.cellsFilled === 1 ? '' : 's'}.
            </p>
            {translateResult.cellsFilled === 0 ? (
              <div className="alert alert-success">Nothing to translate — every cell in scope is already filled.</div>
            ) : (
              <div className="alert alert-success">
                Hindi: {translateResult.byLanguage.hi} · Tamil: {translateResult.byLanguage.ta} · Malayalam:{' '}
                {translateResult.byLanguage.ml}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  )
}

export default CaTranslateParser
