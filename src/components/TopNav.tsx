import { NavLink, useNavigate } from 'react-router-dom'
import { assetUrl } from '../assetUrl'
import { playUiSound } from '../audio/uiAudio'

type TopNavProps = {
  showBrand?: boolean
}

export function TopNav({ showBrand = true }: TopNavProps) {
  const navigate = useNavigate()

  return (
    <header className="top-nav">
      {showBrand ? (
        <button
          type="button"
          className="top-nav__brand"
          onClick={() => {
            playUiSound('back')
            navigate('/')
          }}
        >
          <img
            className="top-nav__logo"
            src={assetUrl('assets/logo_jungle_gaming.svg')}
            alt=""
          />
          <span>Pirate Battle</span>
        </button>
      ) : (
        <span />
      )}

      <nav className="top-nav__links" aria-label="Main">
        <NavLink
          to="/ranking"
          className="nav-link"
          onClick={() => playUiSound('open')}
        >
          Ranking
        </NavLink>
        <NavLink
          to="/history"
          className="nav-link"
          onClick={() => playUiSound('open')}
        >
          History
        </NavLink>
        <NavLink
          to="/options"
          className="nav-link"
          data-testid="options-nav"
          onClick={() => playUiSound('open')}
        >
          Options
        </NavLink>
      </nav>
    </header>
  )
}
