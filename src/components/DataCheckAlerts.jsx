// Shared warning panel for the Month Repair screens — shows id conflicts
// found while merging a fetched day, and format issues found in the
// current month data, as non-blocking warnings the admin can review before
// generating/publishing.
function DataCheckAlerts({ conflicts, formatIssues }) {
  if (conflicts.length === 0 && formatIssues.length === 0) {
    return <div className="alert alert-success">No id conflicts or format issues found.</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {conflicts.map((c, i) => (
        <div key={`conflict-${c.id}-${i}`} className="alert alert-warning">
          ID conflict — {c.message}
        </div>
      ))}
      {formatIssues.map((issue, i) => (
        <div key={`format-${issue.id}-${i}`} className="alert alert-warning">
          Format issue — id "{issue.id}" is missing or has an invalid value for: {issue.fields.join(', ')}
        </div>
      ))}
    </div>
  )
}

export default DataCheckAlerts
