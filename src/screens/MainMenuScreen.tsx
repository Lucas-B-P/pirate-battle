import { useEffect, useState } from 'react'
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
import { loadPlayerName, setPlayerName } from '../storage/playerStorage'

type MenuView = 'home' | 'ranking' | 'history'

export function MainMenuScreen() {
  const navigate = useNavigate()
  const [view, setView] = useState<MenuView>('home')
  const [nickname, setNickname] = useState(() => loadPlayerName())
  const [nameError, setNameError] = useState<string | null>(null)

  useEffect(() => {
    startMenuAmbience()
  }, [])

  function handlePlay() {
    const trimmed = nickname.trim()
    if (!trimmed) {
      setNameError('Digite um nickname para jogar.')
      return
    }

    setPlayerName(trimmed)
    setNameError(null)
    stopMenuAmbience()
    navigate('/game')
  }

  return (
    <ScreenShell title="Menu principal" variant="game">
      <div className="wood-stage">
        <ZoomBackdrop />

        <div
          className={`wood-stage__content ${view !== 'home' ? 'wood-stage__content--wide' : ''}`}
        >
          <WoodPanel wide={view !== 'home'}>
            <img
              className="wood-title"
              src={assetUrl('assets/png/default/ui/menu/title_pirate_battle.png')}
              alt="Batalha Pirata"
            />

            {view === 'home' ? (
              <>
                <p className="wood-tag">Levante âncora. Assuma o comando.</p>
                <form
                  className="wood-nick"
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
                      autoComplete="nickname"
                      maxLength={24}
                      placeholder="Seu nome de pirata"
                      value={nickname}
                      onChange={(event) => {
                        setNickname(event.target.value)
                        if (nameError) setNameError(null)
                      }}
                    />
                  </div>
                  {nameError ? (
                    <p className="wood-nick__error" role="alert">
                      {nameError}
                    </p>
                  ) : null}
                </form>
                <div className="wood-actions">
                  <WoodButton
                    data-testid="play-button"
                    onClick={handlePlay}
                  >
                    Jogar
                  </WoodButton>
                  <WoodButton
                    data-testid="options-button"
                    onClick={() => navigate('/options')}
                  >
                    Opções
                  </WoodButton>
                </div>
                <img
                  className="wood-ornament"
                  src={assetUrl('assets/png/default/ships/ship_3.png')}
                  alt=""
                  aria-hidden="true"
                />
                <p className="wood-foot">
                  Navegue pelas ilhas. Sobreviva à batalha.
                </p>
                <div className="wood-actions wood-actions--row">
                  <WoodButton variant="secondary" onClick={() => setView('ranking')}>
                    Ranking
                  </WoodButton>
                  <WoodButton variant="secondary" onClick={() => setView('history')}>
                    Histórico
                  </WoodButton>
                </div>
              </>
            ) : null}

            {view === 'ranking' || view === 'history' ? (
              <>
                <div className="wood-tabs tabs" role="tablist" aria-label="Abas de registros">
                  <button
                    type="button"
                    className="tab"
                    role="tab"
                    aria-selected={view === 'ranking'}
                    onClick={() => setView('ranking')}
                  >
                    Ranking
                  </button>
                  <button
                    type="button"
                    className="tab"
                    role="tab"
                    aria-selected={view === 'history'}
                    onClick={() => setView('history')}
                  >
                    Match History
                  </button>
                </div>
                <div className="wood-panel-scroll" role="tabpanel">
                  {view === 'ranking' ? <RankingPanel /> : <HistoryPanel />}
                </div>
                <WoodButton variant="secondary" onClick={() => setView('home')}>
                  Voltar
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
