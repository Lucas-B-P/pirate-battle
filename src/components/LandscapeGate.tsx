import { useEffect, useState, type ReactNode } from 'react'

function isCoarsePointer(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(pointer: coarse)').matches ||
    window.matchMedia('(hover: none)').matches
  )
}

function isPortrait(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(orientation: portrait)').matches
}

async function tryLockLandscape(): Promise<void> {
  const orientation = screen.orientation as ScreenOrientation & {
    lock?: (orientation: OrientationLockType) => Promise<void>
  }
  if (!orientation?.lock) return
  try {
    await orientation.lock('landscape')
  } catch {
    // Browsers often require fullscreen / installed PWA; overlay still guides the user.
  }
}

export function LandscapeGate({ children }: { children: ReactNode }) {
  const [blocked, setBlocked] = useState(false)

  useEffect(() => {
    const sync = () => {
      const mobile = isCoarsePointer()
      const portrait = isPortrait()
      setBlocked(mobile && portrait)
      if (mobile && !portrait) {
        void tryLockLandscape()
      }
    }

    sync()
    window.addEventListener('orientationchange', sync)
    window.addEventListener('resize', sync)
    const unlock = () => {
      void tryLockLandscape()
    }
    window.addEventListener('pointerdown', unlock, { once: true })
    window.addEventListener('touchstart', unlock, { once: true })

    return () => {
      window.removeEventListener('orientationchange', sync)
      window.removeEventListener('resize', sync)
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('touchstart', unlock)
    }
  }, [])

  return (
    <>
      {children}
      {blocked ? (
        <div className="landscape-gate" role="alertdialog" aria-modal="true" aria-labelledby="landscape-gate-title">
          <div className="landscape-gate__card">
            <p id="landscape-gate-title" className="landscape-gate__title">
              Rotate your device
            </p>
            <p className="landscape-gate__text">
              Pirate Battle is played in landscape. Turn your phone sideways to continue.
            </p>
          </div>
        </div>
      ) : null}
    </>
  )
}
