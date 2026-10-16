import type { ReactNode } from 'react'

type ScreenShellProps = {
  children: ReactNode
  title?: string
}

export function ScreenShell({ children, title }: ScreenShellProps) {
  return (
    <div className="app-shell">
      <main className="screen" aria-label={title}>
        {children}
      </main>
    </div>
  )
}
