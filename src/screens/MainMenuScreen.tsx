import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { HistoryPanel } from '../components/HistoryPanel'
import { RankingPanel } from '../components/RankingPanel'
import { Button } from '../components/Button'
import { ScreenShell } from '../components/ScreenShell'
import {
  NETWORK_SCENARIOS,
  loadNetworkScenario,
  saveNetworkScenario,
  type NetworkScenario,
} from '../mocks/networkScenario'
import { resetMockData } from '../mocks/data'

type MenuTab = 'ranking' | 'history'

export function MainMenuScreen() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<MenuTab>('ranking')
  const [scenario, setScenario] = useState<NetworkScenario>(loadNetworkScenario())

  function handleScenarioChange(next: NetworkScenario) {
    setScenario(next)
    saveNetworkScenario(next)
  }

  return (
    <ScreenShell title="Main menu">
      <section className="menu-hero">
        <article className="panel menu-card">
          <img
            className="brand-logo"
            src={`${import.meta.env.BASE_URL}assets/logo_jungle_gaming.svg`}
            alt="Jungle Gaming"
          />
          <p className="eyebrow">Naval shooter</p>
          <h1 className="menu-title">Pirate Battle</h1>
          <p className="menu-copy muted">
            Sail between islands, sink enemy ships and climb the ranking before
            the timer ends.
          </p>

          <div className="btn-row" style={{ marginTop: '1.5rem' }}>
            <Button data-testid="play-button" onClick={() => navigate('/game')}>
              Play
            </Button>
            <Button
              data-testid="options-button"
              variant="secondary"
              onClick={() => navigate('/options')}
            >
              Options
            </Button>
          </div>
        </article>

        <aside className="panel menu-side">
          <h2>Controls</h2>
          <ul className="controls-list">
            <li>
              <strong>W / Up</strong> — move forward
            </li>
            <li>
              <strong>A / D or Left / Right</strong> — rotate
            </li>
            <li>
              <strong>Space / J</strong> — front shot
            </li>
            <li>
              <strong>Q / K</strong> — left broadside
            </li>
            <li>
              <strong>E / L</strong> — right broadside
            </li>
            <li>
              <strong>P / Esc</strong> — pause
            </li>
            <li>Touch controls will appear on mobile during combat.</li>
          </ul>
          <img
            className="preview-art"
            src={`${import.meta.env.BASE_URL}assets/sample_menu.png`}
            alt="Pirate Battle menu preview"
          />
        </aside>
      </section>

      <section className="panel menu-panels">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Records</p>
            <h2>Ranking & Match History</h2>
          </div>
        </div>

        <div className="tabs" role="tablist" aria-label="Records tabs">
          <button
            type="button"
            className="tab"
            role="tab"
            aria-selected={tab === 'ranking'}
            onClick={() => setTab('ranking')}
          >
            Ranking
          </button>
          <button
            type="button"
            className="tab"
            role="tab"
            aria-selected={tab === 'history'}
            onClick={() => setTab('history')}
          >
            Match History
          </button>
        </div>

        <div role="tabpanel">
          {tab === 'ranking' ? <RankingPanel /> : <HistoryPanel />}
        </div>

        <div className="network-box">
          <h3>Network scenario (MSW)</h3>
          <p className="muted">
            Use this to test loading, empty lists, errors and register timeouts.
          </p>
          <div className="field">
            <label htmlFor="network-scenario">Scenario</label>
            <select
              id="network-scenario"
              data-testid="network-scenario"
              value={scenario}
              onChange={(event) =>
                handleScenarioChange(event.target.value as NetworkScenario)
              }
            >
              {NETWORK_SCENARIOS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <Button
            variant="ghost"
            onClick={() => {
              resetMockData()
              window.location.reload()
            }}
          >
            Reset mock data
          </Button>
        </div>
      </section>
    </ScreenShell>
  )
}
