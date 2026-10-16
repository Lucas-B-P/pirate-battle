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
        Carregando histórico...
      </div>
    )
  }

  if (historyQuery.isError) {
    return (
      <div className="status-box error" role="alert">
        Não foi possível carregar o histórico. Você ainda pode jogar.
        <div className="btn-row" style={{ marginTop: '0.75rem' }}>
          <Button variant="secondary" onClick={() => void historyQuery.refetch()}>
            Tentar de novo
          </Button>
        </div>
      </div>
    )
  }

  const data = historyQuery.data

  if (!data || data.items.length === 0) {
    return (
      <div className="status-box empty">Nenhuma partida jogada ainda.</div>
    )
  }

  return (
    <div>
      <table className="table">
        <thead>
          <tr>
            <th scope="col">Data</th>
            <th scope="col">Pontos</th>
            <th scope="col">Duração</th>
            <th scope="col">Fim</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((match) => (
            <tr key={match.id}>
              <td>{new Date(match.createdAt).toLocaleString('pt-BR')}</td>
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
          Anterior
        </Button>
        <span className="muted">
          Página {data.page} de {data.totalPages}
        </span>
        <Button
          variant="ghost"
          disabled={page >= data.totalPages}
          onClick={() => setPage((current) => current + 1)}
        >
          Próxima
        </Button>
      </div>
    </div>
  )
}
