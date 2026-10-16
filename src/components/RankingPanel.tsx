import { useState } from 'react'
import { useRanking } from '../api/hooks/useRanking'
import { loadPlayerOptions } from '../storage/optionsStorage'
import { Button } from './Button'

export function RankingPanel() {
  const options = loadPlayerOptions()
  const [page, setPage] = useState(1)
  const rankingQuery = useRanking({
    page,
    pageSize: 5,
    sessionTimeSeconds: options.sessionTimeSeconds,
    enemySpawnTimeSeconds: options.enemySpawnTimeSeconds,
  })

  if (rankingQuery.isLoading) {
    return (
      <div className="status-box" role="status">
        Carregando ranking...
      </div>
    )
  }

  if (rankingQuery.isError) {
    return (
      <div className="status-box error" role="alert">
        Não foi possível carregar o ranking. Você ainda pode jogar.
        <div className="btn-row" style={{ marginTop: '0.75rem' }}>
          <Button variant="secondary" onClick={() => void rankingQuery.refetch()}>
            Tentar de novo
          </Button>
        </div>
      </div>
    )
  }

  const data = rankingQuery.data

  if (!data || data.items.length === 0) {
    return (
      <div className="status-box empty">
        Sem entradas no ranking para as opções atuais (
        {options.sessionTimeSeconds}s / spawn {options.enemySpawnTimeSeconds}s).
      </div>
    )
  }

  return (
    <div>
      <p className="muted" style={{ marginTop: 0 }}>
        Partidas com sessão {options.sessionTimeSeconds}s e spawn{' '}
        {options.enemySpawnTimeSeconds}s.
      </p>
      <table className="table">
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Player</th>
            <th scope="col">Score</th>
            <th scope="col">Duration</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((match, index) => (
            <tr key={match.id}>
              <td>{(data.page - 1) * data.pageSize + index + 1}</td>
              <td>{match.playerName}</td>
              <td>{match.score}</td>
              <td>{match.durationSeconds}s</td>
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
