import type { ReactNode } from 'react'
import { assetUrl } from '../assetUrl'

type SceneBackdropProps = {
  image?: string
  children: ReactNode
  className?: string
  vignette?: boolean
}

export function SceneBackdrop({
  image = 'assets/ui_scene_background.png',
  children,
  className = '',
  vignette = true,
}: SceneBackdropProps) {
  return (
    <div
      className={`scene-backdrop ${className}`.trim()}
      style={{ ['--scene-image' as string]: `url(${assetUrl(image)})` }}
    >
      <div className="scene-backdrop__image" aria-hidden="true" />
      <div className="scene-backdrop__wash" aria-hidden="true" />
      {vignette ? <div className="scene-backdrop__vignette" aria-hidden="true" /> : null}
      <div className="scene-backdrop__content">{children}</div>
    </div>
  )
}
