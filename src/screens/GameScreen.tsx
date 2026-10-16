import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createMatchRecord } from '../api/createMatchRecord'
import { assetUrl } from '../assetUrl'
import { startGameMusic, stopGameMusic } from '../audio/uiAudio'
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

  useEffect(() => {
    startGameMusic()
    return () => {
      stopGameMusic()
    }
  }, [])

  const handleSnapshot = useCallback((next: MatchSnapshot) => {
    setSnapshot(next)
    if (next.paused) {
      setManualPaused(true)
    }
  }, [])

  const handleMatchEnd = useCallback(
    (finalSnapshot: MatchSnapshot) => {
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

  const paused = manualPaused
  const health = Math.round(snapshot?.playerHealth ?? matchConfig.playerMaxHealth)
  const maxHealth = matchConfig.playerMaxHealth
  const healthPct = Math.max(0, Math.min(100, (health / maxHealth) * 100))

  return (
    <ScreenShell title="Match" variant="game">
      <section className="game-fullscreen">
        <div className="sample-hud" aria-live="polite" data-testid="match-hud">
          <div className="sample-hud__left">
            <div className="hull-bar">
              <img
                className="hull-bar__icon"
                src={assetUrl('assets/png/default/ui/hud/icon_heart.png')}
                alt=""
              />
              <div className="hull-bar__track">
                <img
                  className="hull-bar__frame"
                  src={assetUrl('assets/png/default/ui/hud/health_frame.png')}
                  alt=""
                />
                <div className="hull-bar__fill-wrap">
                  <div
                    className="hull-bar__fill"
                    style={{ width: `${healthPct}%` }}
                  />
                </div>
                <strong className="hull-bar__label" data-testid="hud-health">
                  {health} / {maxHealth}
                </strong>
              </div>
            </div>
          </div>

          <div className="sample-hud__right">
            <div className="hud-plaque">
              <img
                className="hud-plaque__bg"
                src={assetUrl('assets/png/default/ui/hud/counter_panel.png')}
                alt=""
              />
              <img
                className="hud-plaque__icon"
                src={assetUrl('assets/png/default/ui/hud/icon_score.png')}
                alt=""
              />
              <strong data-testid="hud-score">{snapshot?.score ?? 0}</strong>
            </div>
            <div className="hud-plaque">
              <img
                className="hud-plaque__bg"
                src={assetUrl('assets/png/default/ui/hud/counter_panel.png')}
                alt=""
              />
              <img
                className="hud-plaque__icon"
                src={assetUrl('assets/png/default/ui/hud/icon_time.png')}
                alt=""
              />
              <strong data-testid="hud-time">
                {formatTime(snapshot?.timeLeft ?? matchConfig.sessionTimeSeconds)}
              </strong>
            </div>
            <button
              type="button"
              className="hud-pause"
              aria-label={paused ? 'Continuar' : 'Pausar'}
              onClick={() => setManualPaused((value) => !value)}
            >
              <img
                src={assetUrl('assets/png/default/ui/controls/button_round_normal.png')}
                alt=""
                className="hud-pause__bg"
              />
              <img
                src={assetUrl('assets/png/default/ui/controls/icon_pause.png')}
                alt=""
                className="hud-pause__icon"
              />
            </button>
          </div>
        </div>

        <span className="sr-only" data-testid="hud-status">
          {paused ? 'Paused' : 'Fighting'}
        </span>

        <GameCanvas
          config={matchConfig}
          onSnapshot={handleSnapshot}
          onMatchEnd={handleMatchEnd}
          externalPaused={manualPaused}
          onRequestResume={() => setManualPaused(false)}
          onRequestOptions={() => navigate('/options')}
          onRequestMainMenu={() => navigate('/')}
        />
      </section>
    </ScreenShell>
  )
}
