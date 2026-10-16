import { useNavigate } from 'react-router-dom'
import { HistoryPanel } from '../components/HistoryPanel'
import { ScreenShell } from '../components/ScreenShell'
import { WoodBrand } from '../components/WoodBrand'
import { WoodButton } from '../components/WoodButton'
import { WoodPanel } from '../components/WoodPanel'
import { ZoomBackdrop } from '../components/ZoomBackdrop'

export function HistoryScreen() {
  const navigate = useNavigate()

  return (
    <ScreenShell title="Histórico" variant="game">
      <div className="wood-stage">
        <ZoomBackdrop />
        <div className="wood-stage__content wood-stage__content--wide">
          <WoodPanel wide>
            <p className="wood-tag">Suas viagens</p>
            <h1 className="wood-score" style={{ fontSize: '2rem' }}>
              Histórico
            </h1>
            <div className="wood-panel-scroll">
              <HistoryPanel />
            </div>
            <WoodButton variant="secondary" onClick={() => navigate('/')}>
              Voltar
            </WoodButton>
          </WoodPanel>
        </div>

        <WoodBrand />
      </div>
    </ScreenShell>
  )
}
