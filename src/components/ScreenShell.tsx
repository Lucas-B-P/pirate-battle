import type { ReactNode } from 'react'

type ScreenShellProps = {
  children: ReactNode
  title?: string
  variant?: 'page' | 'immersive' | 'game'
}

export function ScreenShell({
  children,
  title,
  variant = 'page',
}: ScreenShellProps) {
  return (
    <div className={`app-shell app-shell--${variant}`}>
      <main className={`screen screen--${variant}`} aria-label={title}>
        {children}
      </main>
    </div>
  )
}
