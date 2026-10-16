import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRegisterMatch } from '../api/hooks/useRegisterMatch'
import { startMenuAmbience } from '../audio/uiAudio'
import { ScreenShell } from '../components/ScreenShell'
import { WoodBrand } from '../components/WoodBrand'
import { WoodButton } from '../components/WoodButton'
import { WoodPanel } from '../components/WoodPanel'
import { ZoomBackdrop } from '../components/ZoomBackdrop'
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

function formatReason(reason?: string | null) {
  if (reason === 'death') return 'Derrota'
  if (reason === 'timeout') return 'Tempo'
  return reason ?? '—'
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

      if (!pending || !current) return

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
    startMenuAmbience()
  }, [])

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
  }, [refreshPendingCount, submitMatch])

  const canRetry =
    Boolean(loadPendingMatch()) &&
    (result?.registerStatus === 'error' || result?.registerStatus === 'pending')

  const mins = Math.floor((result?.durationSeconds ?? 0) / 60)
  const secs = (result?.durationSeconds ?? 0) % 60
  const timeLabel = `${mins.toString().padStart(2, '0')}:${secs
    .toString()
    .padStart(2, '0')}`

  return (
    <ScreenShell title="Resultado" variant="game">
      <div className="wood-stage">
        <ZoomBackdrop />

        <div className="wood-stage__content">
          <WoodPanel>
            <h1 className="wood-score" style={{ fontSize: '1.55rem', color: '#f4f7fa' }}>
              Fim de batalha
            </h1>
            <p className="wood-score">{result?.score ?? 0}</p>
            <p className="wood-meta">
              Pontos · {timeLabel} · {formatReason(result?.endReason)}
            </p>
            <p className="wood-foot" data-testid="save-status">
              {statusLabel(result?.registerStatus ?? 'idle')}
            </p>

            {result?.registerStatus === 'error' ? (
              <p className="status-box error" role="alert">
                Falha ao registrar. Tente de novo.
              </p>
            ) : null}

            <div className="wood-actions">
              {canRetry ? (
                <WoodButton
                  data-testid="retry-save"
                  variant="secondary"
                  disabled={registerMatch.isPending}
                  onClick={() => void submitMatch(result?.matchId)}
                >
                  Tentar salvar
                </WoodButton>
              ) : null}
              <WoodButton data-testid="play-again" onClick={() => navigate('/game')}>
                Jogar de novo
              </WoodButton>
              <WoodButton data-testid="result-main-menu" onClick={() => navigate('/')}>
                Menu
              </WoodButton>
            </div>

            {pendingCount > 1 ? (
              <p className="wood-foot">Pendentes na fila: {pendingCount}</p>
            ) : null}
          </WoodPanel>
        </div>

        <WoodBrand />
      </div>
    </ScreenShell>
  )
}
