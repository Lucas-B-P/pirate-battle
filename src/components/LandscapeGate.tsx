import { useEffect, useState, type ReactNode } from 'react'
import { isMobileClient, isPortrait } from '../mobile/device'
import { enterImmersiveLandscape, exitImmersiveLandscape } from '../mobile/immersive'

export function LandscapeGate({ children }: { children: ReactNode }) {
  const [blocked, setBlocked] = useState(false)

  useEffect(() => {
    const sync = () => {
      const mobile = isMobileClient()
      const portrait = isPortrait()
      setBlocked(mobile && portrait)
      if (mobile && portrait) {
        void exitImmersiveLandscape()
      } else if (mobile && !portrait) {
        void enterImmersiveLandscape()
      } else {
        void exitImmersiveLandscape()
      }
    }

    sync()
    window.addEventListener('orientationchange', sync)
    window.addEventListener('resize', sync)
    const onGesture = () => {
      void enterImmersiveLandscape()
    }
    window.addEventListener('pointerdown', onGesture)
    window.addEventListener('touchstart', onGesture)

    return () => {
      window.removeEventListener('orientationchange', sync)
      window.removeEventListener('resize', sync)
      window.removeEventListener('pointerdown', onGesture)
      window.removeEventListener('touchstart', onGesture)
      void exitImmersiveLandscape()
    }
  }, [])

  return (
    <>
      {children}
      {blocked ? (
        <div
          className="landscape-gate"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="landscape-gate-title"
        >
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
