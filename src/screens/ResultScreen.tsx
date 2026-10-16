import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRegisterMatch } from '../api/hooks/useRegisterMatch'
import { Button } from '../components/Button'
import { ScreenShell } from '../components/ScreenShell'
import { loadLastResult, saveLastResult } from '../storage/lastResultStorage'
import {
  loadPendingMatch,
  loadPendingMatches,
  removePendingMatch,
} from '../storage/pendingMatchStorage'
import type { LastMatchResult, RegisterStatus } from '../types/match'

function statusLabel(status: RegisterStatus): string {
  switch (status) {
    case 'saving':
      return 'Saving...'
    case 'success':
      return 'Saved'
    case 'error':
      return 'Failed'
    case 'pending':
      return 'Pending'
    default:
      return 'Idle'
  }
}

export function ResultScreen() {
  const navigate = useNavigate()
  const registerMatch = useRegisterMatch()
  const [result, setResult] = useState<LastMatchResult | null>(() => loadLastResult())
  const [pendingCount, setPendingCount] = useState(() => loadPendingMatches().length)
  const triedAutoSave = useRef(false)

  const refreshPendingCount = useCallback(() => {
    setPendingCount(loadPendingMatches().length)
  }, [])

  const submitMatch = useCallback(
    async (matchId?: string) => {
      const pendingList = loadPendingMatches()
      const pending =
        pendingList.find((item) => item.id === matchId) ?? pendingList[0] ?? null
      const current = loadLastResult()

      if (!pending || !current) {
        return
      }

      if (current.registerStatus === 'success' && current.matchId === pending.id) {
        removePendingMatch(pending.id)
        refreshPendingCount()
        return
      }

      const savingResult: LastMatchResult = {
        ...current,
        matchId: pending.id,
        score: pending.score,
        durationSeconds: pending.durationSeconds,
        endReason: pending.endReason,
        config: pending.config,
        registerStatus: 'saving',
        errorMessage: undefined,
      }
      setResult(savingResult)
      saveLastResult(savingResult)

      try {
        const saved = await registerMatch.mutateAsync(pending)
        const successResult: LastMatchResult = {
          ...savingResult,
          matchId: saved.id,
          registerStatus: 'success',
          errorMessage: undefined,
        }
        saveLastResult(successResult)
        setResult(successResult)
        refreshPendingCount()
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Could not register match'
        const errorResult: LastMatchResult = {
          ...savingResult,
          registerStatus: 'error',
          errorMessage: message,
        }
        saveLastResult(errorResult)
        setResult(errorResult)
        refreshPendingCount()
      }
    },
    [refreshPendingCount, registerMatch],
  )

  useEffect(() => {
    if (triedAutoSave.current) return
    triedAutoSave.current = true

    const pending = loadPendingMatch()
    const current = loadLastResult()
    if (!pending || !current) return
    if (current.registerStatus === 'success' && current.matchId === pending.id) {
      removePendingMatch(pending.id)
      refreshPendingCount()
      return
    }

    void submitMatch(pending.id)
    // Run once when the result screen opens / reloads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const canRetry =
    Boolean(loadPendingMatch()) &&
    (result?.registerStatus === 'error' || result?.registerStatus === 'pending')

  return (
    <ScreenShell title="Match result">
      <section className="panel result-card">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Battle over</p>
            <h1>Match result</h1>
            <p className="muted">
              {result
                ? 'Finished matches are registered once in ranking and history.'
                : 'No finished match yet. Abandoned battles are not saved.'}
            </p>
          </div>
        </div>

        <div className="result-grid">
          <div className="result-stat">
            <span className="muted">Score</span>
            <strong>{result?.score ?? 0}</strong>
          </div>
          <div className="result-stat">
            <span className="muted">Time played</span>
            <strong>{result?.durationSeconds ?? 0}s</strong>
          </div>
          <div className="result-stat">
            <span className="muted">Ended by</span>
            <strong>{result?.endReason ?? '-'}</strong>
          </div>
          <div className="result-stat">
            <span className="muted">Save status</span>
            <strong data-testid="save-status">
              {statusLabel(result?.registerStatus ?? 'idle')}
            </strong>
          </div>
        </div>

        {result?.config ? (
          <p className="muted">
            Config used: {result.config.sessionTimeSeconds}s session · spawn every{' '}
            {result.config.enemySpawnTimeSeconds}s
          </p>
        ) : null}

        {pendingCount > 1 ? (
          <p className="muted">Pending saves in queue: {pendingCount}</p>
        ) : null}

        {result?.registerStatus === 'error' ? (
          <div className="status-box error" role="alert">
            Could not register this match. You can retry now or play another
            match while pending saves are kept locally.
            {result.errorMessage ? <p>{result.errorMessage}</p> : null}
          </div>
        ) : null}

        {result?.registerStatus === 'success' ? (
          <div className="status-box" role="status">
            Match registered. Ranking and Match History will show this entry.
          </div>
        ) : null}

        {result?.registerStatus === 'pending' ||
        result?.registerStatus === 'saving' ? (
          <div className="status-box" role="status">
            Saving match record...
          </div>
        ) : null}

        <div className="btn-row" style={{ marginTop: '1rem' }}>
          {canRetry ? (
            <Button
              data-testid="retry-save"
              variant="secondary"
              disabled={registerMatch.isPending}
              onClick={() => void submitMatch(result?.matchId)}
            >
              Retry save
            </Button>
          ) : null}
          <Button data-testid="play-again" onClick={() => navigate('/game')}>
            Play again
          </Button>
          <Button
            data-testid="result-main-menu"
            variant="secondary"
            onClick={() => navigate('/')}
          >
            Main menu
          </Button>
        </div>
      </section>
    </ScreenShell>
  )
}
