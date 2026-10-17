import { useState } from 'react'
import { useMatchHistory } from '../api/hooks/useMatchHistory'
import { getPlayerId } from '../storage/playerStorage'
import { Button } from './Button'

export function HistoryPanel() {
  const playerId = getPlayerId()
  const [page, setPage] = useState(1)
  const historyQuery = useMatchHistory(playerId, page)

  if (historyQuery.isLoading) {
    return (
      <div className="status-box" role="status">
        Loading match history...
      </div>
    )
  }

  if (historyQuery.isError) {
    return (
      <div className="status-box error" role="alert">
        Could not load match history. You can still play.
        <div className="btn-row" style={{ marginTop: '0.75rem' }}>
          <Button variant="secondary" onClick={() => void historyQuery.refetch()}>
            Try again
          </Button>
        </div>
      </div>
    )
  }

  const data = historyQuery.data

  if (!data || data.items.length === 0) {
    return (
      <div className="status-box empty">No matches played yet.</div>
    )
  }

  return (
    <div>
      <table className="table">
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Score</th>
            <th scope="col">Duration</th>
            <th scope="col">End</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((match) => (
            <tr key={match.id}>
              <td>{new Date(match.createdAt).toLocaleString('en-US')}</td>
              <td>{match.score}</td>
              <td>{match.durationSeconds}s</td>
              <td>{match.endReason}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="pagination">
        <Button
          variant="ghost"
          disabled={page <= 1}
          onClick={() => setPage((current) => Math.max(1, current - 1))}
        >
          Previous
        </Button>
        <span className="muted">
          Page {data.page} of {data.totalPages}
        </span>
        <Button
          variant="ghost"
          disabled={page >= data.totalPages}
          onClick={() => setPage((current) => current + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  )
}
