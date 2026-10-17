import { useNavigate } from 'react-router-dom'
import { RankingPanel } from '../components/RankingPanel'
import { ScreenShell } from '../components/ScreenShell'
import { WoodBrand } from '../components/WoodBrand'
import { WoodButton } from '../components/WoodButton'
import { WoodPanel } from '../components/WoodPanel'
import { ZoomBackdrop } from '../components/ZoomBackdrop'

export function RankingScreen() {
  const navigate = useNavigate()

  return (
    <ScreenShell title="Ranking" variant="game">
      <div className="wood-stage">
        <ZoomBackdrop />
        <div className="wood-stage__content wood-stage__content--wide">
          <WoodPanel wide>
            <p className="wood-tag">Scoreboard</p>
            <h1 className="wood-score" style={{ fontSize: '2rem' }}>
              Ranking
            </h1>
            <div className="wood-panel-scroll">
              <RankingPanel />
            </div>
            <WoodButton variant="secondary" onClick={() => navigate('/')}>
              Back
            </WoodButton>
          </WoodPanel>
        </div>

        <WoodBrand />
      </div>
    </ScreenShell>
  )
}
