import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { assetUrl } from '../assetUrl'
import { playUiSound } from '../audio/uiAudio'

type WoodButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  variant?: 'primary' | 'secondary'
}

export function WoodButton({
  children,
  variant = 'primary',
  className = '',
  type = 'button',
  onClick,
  ...props
}: WoodButtonProps) {
  const normal =
    variant === 'primary'
      ? assetUrl('assets/png/default/ui/menu/button_primary_normal.png')
      : assetUrl('assets/png/default/ui/menu/button_secondary_normal.png')
  const pressed =
    variant === 'primary'
      ? assetUrl('assets/png/default/ui/menu/button_primary_pressed.png')
      : assetUrl('assets/png/default/ui/menu/button_secondary_pressed.png')
  const hover =
    variant === 'primary'
      ? assetUrl('assets/png/default/ui/menu/button_primary_hover.png')
      : normal

  return (
    <button
      type={type}
      className={`wood-btn wood-btn--${variant} ${className}`.trim()}
      style={{
        ['--wood-btn' as string]: `url(${normal})`,
        ['--wood-btn-hover' as string]: `url(${hover})`,
        ['--wood-btn-pressed' as string]: `url(${pressed})`,
      }}
      onClick={(event) => {
        playUiSound('click')
        onClick?.(event)
      }}
      {...props}
    >
      <span className="wood-btn__label">{children}</span>
    </button>
  )
}
