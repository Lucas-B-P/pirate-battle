import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { assetUrl } from '../assetUrl'
import { startMenuAmbience, stopMenuAmbience } from '../audio/uiAudio'
import { HistoryPanel } from '../components/HistoryPanel'
import { RankingPanel } from '../components/RankingPanel'
import { ScreenShell } from '../components/ScreenShell'
import { WoodBrand } from '../components/WoodBrand'
import { WoodButton } from '../components/WoodButton'
import { WoodPanel } from '../components/WoodPanel'
import { ZoomBackdrop } from '../components/ZoomBackdrop'
import { PLAYER_SKIN_COUNT, PLAYER_SKIN_NAMES, playerSkinPath } from '../game/shipSkins'
import { loadPlayerName, loadShipSkin, setPlayerName, setShipSkin } from '../storage/playerStorage'

type MenuView = 'home' | 'ranking' | 'history'

export function MainMenuScreen() {
  const navigate = useNavigate()
  const [view, setView] = useState<MenuView>('home')
  const [nickname, setNickname] = useState(() => loadPlayerName())
  const [nameError, setNameError] = useState<string | null>(null)
  const [shipSkin, setShipSkinIndex] = useState(() => loadShipSkin())
  const pendingTabFocus = useRef<'ranking' | 'history' | null>(null)

  useEffect(() => {
    if (view === 'home' || !pendingTabFocus.current) return
    const id = view === 'ranking' ? 'tab-ranking' : 'tab-history'
    pendingTabFocus.current = null
    document.getElementById(id)?.focus()
  }, [view])

  function onTabKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const next =
      event.key === 'ArrowRight' || event.key === 'End'
        ? 'history'
        : event.key === 'ArrowLeft' || event.key === 'Home'
          ? 'ranking'
          : null
    if (!next) return
    event.preventDefault()
    pendingTabFocus.current = next
    setView(next)
  }

  useEffect(() => {
    startMenuAmbience()
  }, [])

  function stepSkin(delta: number) {
    const next = (shipSkin + delta + PLAYER_SKIN_COUNT) % PLAYER_SKIN_COUNT
    setShipSkinIndex(next)
    setShipSkin(next)
  }

  function handlePlay() {
    const trimmed = nickname.trim()
    if (!trimmed) {
      setNameError('Enter a nickname to play.')
      return
    }

    setPlayerName(trimmed)
    setNameError(null)
    stopMenuAmbience()
    navigate('/game')
  }

  return (
    <ScreenShell title="Main Menu" variant="game">
      <div className="wood-stage">
        <ZoomBackdrop />

        <div
          className={`wood-stage__content ${view !== 'home' ? 'wood-stage__content--wide' : ''}`}
        >
          <WoodPanel wide={view !== 'home'}>
            <img
              className="wood-title"
              src={assetUrl('assets/png/default/ui/menu/title_pirate_battle.png')}
              alt="Pirate Battle"
            />

            {view === 'home' ? (
              <>
                <p className="wood-tag">Hoist anchor. Take command.</p>
                <form
                  className="wood-nick"
                  autoComplete="off"
                  onSubmit={(event) => {
                    event.preventDefault()
                    handlePlay()
                  }}
                >
                  <label className="wood-nick__label" htmlFor="player-nickname">
                    Nickname
                  </label>
                  <div
                    className="wood-nick__frame"
                    style={{
                      ['--wood-nick' as string]: `url(${assetUrl(
                        'assets/png/default/ui/menu/button_primary_normal.png',
                      )})`,
                      ['--wood-nick-focus' as string]: `url(${assetUrl(
                        'assets/png/default/ui/menu/button_primary_hover.png',
                      )})`,
                    }}
                  >
                    <input
                      id="player-nickname"
                      className="wood-nick__input"
                      data-testid="player-nickname"
                      type="text"
                      name="nickname"
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                      maxLength={24}
                      placeholder="Your pirate name"
                      value={nickname}
                      aria-invalid={nameError ? true : undefined}
                      aria-describedby={nameError ? 'player-nickname-error' : undefined}
                      onChange={(event) => {
                        setNickname(event.target.value)
                        if (nameError) setNameError(null)
                      }}
                    />
                  </div>
                  {nameError ? (
                    <p id="player-nickname-error" className="wood-nick__error" role="alert">
                      {nameError}
                    </p>
                  ) : null}
                </form>
                <div className="wood-actions">
                  <WoodButton
                    data-testid="play-button"
                    onClick={handlePlay}
                  >
                    Play
                  </WoodButton>
                  <WoodButton
                    data-testid="options-button"
                    onClick={() => navigate('/options')}
                  >
                    Options
                  </WoodButton>
                </div>
                <div
                  className="ship-picker"
                  role="group"
                  aria-label="Ship selection"
                  onKeyDown={(event) => {
                    if (event.key === 'ArrowLeft') {
                      event.preventDefault()
                      stepSkin(-1)
                    } else if (event.key === 'ArrowRight') {
                      event.preventDefault()
                      stepSkin(1)
                    }
                  }}
                >
                  <div className="ship-picker__row">
                    <button
                      type="button"
                      className="ship-picker__btn"
                      aria-label="Previous ship"
                      onClick={() => stepSkin(-1)}
                    >
                      ‹
                    </button>
                    <div className="ship-picker__preview">
                      <img
                        className="ship-picker__ship"
                        src={assetUrl(playerSkinPath(shipSkin))}
                        alt=""
                      />
                    </div>
                    <button
                      type="button"
                      className="ship-picker__btn"
                      aria-label="Next ship"
                      onClick={() => stepSkin(1)}
                    >
                      ›
                    </button>
                  </div>
                  <p id="ship-skin-name" className="ship-picker__name" aria-live="polite">
                    {PLAYER_SKIN_NAMES[shipSkin] ?? 'Ship'}
                  </p>
                </div>
                <div className="wood-controls" aria-label="Controls">
                  <p className="wood-controls__line">
                    <span>W</span> forward · <span>A</span>/<span>D</span> turn
                  </p>
                  <p className="wood-controls__line">
                    <span>Space</span> cannon · <span>Q</span>/<span>E</span> broadside · <span>P</span> pause
                  </p>
                </div>
                <div className="wood-actions wood-actions--row">
                  <WoodButton variant="secondary" onClick={() => setView('ranking')}>
                    Ranking
                  </WoodButton>
                  <WoodButton variant="secondary" onClick={() => setView('history')}>
                    Match History
                  </WoodButton>
                </div>
              </>
            ) : null}

            {view === 'ranking' || view === 'history' ? (
              <>
                <div className="wood-tabs tabs" role="tablist" aria-label="Record tabs">
                  <button
                    id="tab-ranking"
                    type="button"
                    className="tab"
                    role="tab"
                    aria-selected={view === 'ranking'}
                    aria-controls="records-panel"
                    tabIndex={view === 'ranking' ? 0 : -1}
                    onClick={() => setView('ranking')}
                    onKeyDown={onTabKeyDown}
                  >
                    Ranking
                  </button>
                  <button
                    id="tab-history"
                    type="button"
                    className="tab"
                    role="tab"
                    aria-selected={view === 'history'}
                    aria-controls="records-panel"
                    tabIndex={view === 'history' ? 0 : -1}
                    onClick={() => setView('history')}
                    onKeyDown={onTabKeyDown}
                  >
                    Match History
                  </button>
                </div>
                <div
                  id="records-panel"
                  className="wood-panel-scroll"
                  role="tabpanel"
                  aria-labelledby={view === 'ranking' ? 'tab-ranking' : 'tab-history'}
                >
                  {view === 'ranking' ? <RankingPanel /> : <HistoryPanel />}
                </div>
                <WoodButton variant="secondary" onClick={() => setView('home')}>
                  Back
                </WoodButton>
              </>
            ) : null}
          </WoodPanel>
        </div>

        <WoodBrand />
      </div>
    </ScreenShell>
  )
}
