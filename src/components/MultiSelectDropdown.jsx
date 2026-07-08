import { useEffect, useRef, useState } from 'react'

function MultiSelectDropdown({ options, selectedValues, onChange, placeholder = 'Select…' }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return

    function handleClickOutside(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const selectedSet = new Set(selectedValues)

  function toggleValue(value) {
    const next = new Set(selectedSet)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    onChange([...next])
  }

  const label =
    selectedValues.length === 0
      ? placeholder
      : selectedValues.length === options.length
        ? `All ${options.length} selected`
        : `${selectedValues.length} selected`

  return (
    <div className="multiselect" ref={rootRef}>
      <button
        type="button"
        className="multiselect-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className={selectedValues.length === 0 ? 'multiselect-placeholder' : ''}>{label}</span>
        <span className="multiselect-caret">▾</span>
      </button>

      {open && (
        <div className="multiselect-panel">
          <div className="multiselect-actions">
            <button type="button" className="multiselect-action" onClick={() => onChange(options.map((o) => o.value))}>
              Select all
            </button>
            <button type="button" className="multiselect-action" onClick={() => onChange([])}>
              Clear
            </button>
          </div>
          <div className="multiselect-list">
            {options.map((opt) => (
              <label
                key={opt.value}
                className={`multiselect-option${opt.used ? ' multiselect-option--used' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={selectedSet.has(opt.value)}
                  onChange={() => toggleValue(opt.value)}
                />
                <span>{opt.label}</span>
                {opt.used && <span className="multiselect-used-badge">✓ Published</span>}
              </label>
            ))}
            {options.length === 0 && <div className="multiselect-empty">No items</div>}
          </div>
        </div>
      )}
    </div>
  )
}

export default MultiSelectDropdown
