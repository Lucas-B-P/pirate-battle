import type { ReactNode } from 'react'
import { assetUrl } from '../assetUrl'

type WoodPanelProps = {
  children: ReactNode
  className?: string
  wide?: boolean
}

export function WoodPanel({ children, className = '', wide = false }: WoodPanelProps) {
  return (
    <div
      className={`wood-panel ${wide ? 'wood-panel--wide' : ''} ${className}`.trim()}
      style={{
        ['--wood-panel' as string]: `url(${assetUrl('assets/png/default/ui/menu/panel_menu.png')})`,
      }}
    >
      <div className="wood-panel__inner">{children}</div>
    </div>
  )
}
