import { useEffect, useState, type ReactNode } from 'react'
import { isMobileClient, isPortrait, isStandaloneDisplay } from '../mobile/device'
import { enterImmersiveLandscape, exitImmersiveLandscape } from '../mobile/immersive'

export function LandscapeGate({ children }: { children: ReactNode }) {
  const [blocked, setBlocked] = useState(false)
  const [chromeTip, setChromeTip] = useState(false)
  const [chromeTipGone, setChromeTipGone] = useState(false)

  useEffect(() => {
    const sync = () => {
      const mobile = isMobileClient()
      const portrait = isPortrait()
      setBlocked(mobile && portrait)
      if (mobile && portrait) {
        void exitImmersiveLandscape()
        setChromeTip(false)
      } else if (mobile && !portrait) {
        void enterImmersiveLandscape()
        if (!isStandaloneDisplay()) {
          setChromeTip(true)
          setChromeTipGone(false)
        } else {
          setChromeTip(false)
        }
      } else {
        void exitImmersiveLandscape()
        setChromeTip(false)
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

  useEffect(() => {
    if (!chromeTip) return
    const fade = window.setTimeout(() => setChromeTipGone(true), 4500)
    const hide = window.setTimeout(() => setChromeTip(false), 5200)
    return () => {
      window.clearTimeout(fade)
      window.clearTimeout(hide)
    }
  }, [chromeTip])

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
      {chromeTip ? (
        <p
          className={`landscape-chrome-tip${chromeTipGone ? ' landscape-chrome-tip--gone' : ''}`}
          aria-hidden="true"
        >
          Add to Home Screen for true fullscreen
        </p>
      ) : null}
    </>
  )
}
