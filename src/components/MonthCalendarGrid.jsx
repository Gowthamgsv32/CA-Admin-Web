import { daysInMonth, firstWeekdayOfMonth } from '../utils/monthRepair'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// dayInfo: Map<dayNumber, { present: boolean, label?: string, error?: string }>
// A day missing from the map is treated as not present (no data fetched or
// published yet for that date).
function MonthCalendarGrid({ month, year, dayInfo, fetchingDay, onFetchDay }) {
  const total = daysInMonth(month, year)
  const offset = firstWeekdayOfMonth(month, year)

  const cells = []
  for (let i = 0; i < offset; i++) cells.push(null)
  for (let d = 1; d <= total; d++) cells.push(d)

  return (
    <div className="month-calendar">
      <div className="month-calendar-weekdays">
        {WEEKDAYS.map((w) => (
          <div key={w} className="month-calendar-weekday">
            {w}
          </div>
        ))}
      </div>
      <div className="month-calendar-grid">
        {cells.map((d, i) => {
          if (d === null) return <div key={`blank-${i}`} className="month-calendar-cell month-calendar-cell--blank" />

          const info = dayInfo.get(d) || { present: false }
          const isFetching = fetchingDay === d

          return (
            <div
              key={d}
              className={`month-calendar-cell${info.present ? ' month-calendar-cell--present' : ' month-calendar-cell--missing'}`}
            >
              <span className="month-calendar-day">{d}</span>
              {info.present ? (
                <span className="month-calendar-label">{info.label || 'Present'}</span>
              ) : (
                <button
                  type="button"
                  className="month-calendar-fetch-btn"
                  onClick={() => onFetchDay(d)}
                  disabled={isFetching}
                >
                  {isFetching ? '…' : 'Fetch'}
                </button>
              )}
              {info.error && (
                <span className="month-calendar-error-dot" title={info.error}>
                  !
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default MonthCalendarGrid
