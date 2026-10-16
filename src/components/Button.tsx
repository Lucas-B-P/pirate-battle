import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { playUiSound } from '../audio/uiAudio'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'ghost'
  'data-testid'?: string
}

export function Button({
  children,
  variant = 'primary',
  className = '',
  type = 'button',
  onClick,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`btn btn-${variant} ${className}`.trim()}
      onClick={(event) => {
        playUiSound('click')
        onClick?.(event)
      }}
      {...props}
    >
      {children}
    </button>
  )
}
