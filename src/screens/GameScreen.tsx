import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createMatchRecord } from '../api/createMatchRecord'
import { Button } from '../components/Button'
import { ScreenShell } from '../components/ScreenShell'
import { createMatchConfig } from '../config/gameConfig'
import { GameCanvas } from '../game/GameCanvas'
import type { MatchSnapshot } from '../game/types'
import { saveLastResult } from '../storage/lastResultStorage'
import { loadPlayerOptions } from '../storage/optionsStorage'
import { savePendingMatch } from '../storage/pendingMatchStorage'

function formatTime(seconds: number): string {
  const total = Math.max(0, Math.ceil(seconds))
  const mins = Math.floor(total / 60)
  const secs = total % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function GameScreen() {
  const navigate = useNavigate()
  const matchConfig = useMemo(() => createMatchConfig(loadPlayerOptions()), [])
  const [snapshot, setSnapshot] = useState<MatchSnapshot | null>(null)
  const [manualPaused, setManualPaused] = useState(false)

  const handleSnapshot = useCallback((next: MatchSnapshot) => {
    setSnapshot(next)
    // In-game pause (P / blur) should also lock the React pause UI.
    if (next.paused) {
      setManualPaused(true)
    }
  }, [])

  const handleMatchEnd = useCallback(
    (finalSnapshot: MatchSnapshot) => {
      // Abandoned matches never reach this callback.
      const match = createMatchRecord({
        score: finalSnapshot.score,
        durationSeconds: Math.round(finalSnapshot.durationPlayed),
        endReason: finalSnapshot.endReason ?? 'timeout',
        config: matchConfig,
      })

      savePendingMatch(match)
      saveLastResult({
        matchId: match.id,
        score: match.score,
        durationSeconds: match.durationSeconds,
        endReason: match.endReason,
        savedAt: match.createdAt,
        registerStatus: 'pending',
        config: match.config,
      })

      navigate('/result')
    },
    [matchConfig, navigate],
  )

  // React pause flag is the source of truth for the HUD/overlay.
  // Simulation pause is synced into this flag, and Resume clears it.
  const paused = manualPaused

  return (
    <ScreenShell title="Match">
      <section className="panel game-shell">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Combat</p>
            <h1>Pirate Battle</h1>
            <p className="muted">
              Session {matchConfig.sessionTimeSeconds}s · Spawn every{' '}
              {matchConfig.enemySpawnTimeSeconds}s
            </p>
          </div>
          <div className="btn-row">
            <Button
              variant="secondary"
              onClick={() => setManualPaused((value) => !value)}
            >
              {paused ? 'Resume' : 'Pause'}
            </Button>
            <Button variant="ghost" onClick={() => navigate('/')}>
              Leave match
            </Button>
          </div>
        </div>

        <div className="hud" aria-live="polite" data-testid="match-hud">
          <div className="hud-item">
            <span>Score</span>
            <strong data-testid="hud-score">{snapshot?.score ?? 0}</strong>
          </div>
          <div className="hud-item">
            <span>Time</span>
            <strong data-testid="hud-time">
              {formatTime(snapshot?.timeLeft ?? matchConfig.sessionTimeSeconds)}
            </strong>
          </div>
          <div className="hud-item">
            <span>Hull</span>
            <strong data-testid="hud-health">
              {Math.round(snapshot?.playerHealth ?? matchConfig.playerMaxHealth)}/
              {matchConfig.playerMaxHealth}
            </strong>
          </div>
          <div className="hud-item">
            <span>Status</span>
            <strong data-testid="hud-status">{paused ? 'Paused' : 'Fighting'}</strong>
          </div>
        </div>

        <GameCanvas
          config={matchConfig}
          onSnapshot={handleSnapshot}
          onMatchEnd={handleMatchEnd}
          externalPaused={manualPaused}
          onRequestResume={() => setManualPaused(false)}
        />

        <p className="muted game-help">
          Keyboard: W move · A/D rotate · Space front shot · Q/E broadsides · P
          pause. Leaving the match abandons it without saving.
        </p>
      </section>
    </ScreenShell>
  )
}
