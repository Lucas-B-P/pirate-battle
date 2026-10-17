import { isMobileClient, isPortrait } from './device'

function docEl(): HTMLElement {
  return document.documentElement
}

export async function enterImmersiveLandscape(): Promise<void> {
  if (!isMobileClient() || isPortrait()) return

  docEl().classList.add('immersive-mobile')
  document.body.classList.add('immersive-mobile')

  const orientation = screen.orientation as ScreenOrientation & {
    lock?: (orientation: OrientationLockType) => Promise<void>
  }
  try {
    await orientation.lock?.('landscape')
  } catch {
    // Ignore — overlay / CSS still apply.
  }

  const root = docEl() as HTMLElement & {
    requestFullscreen?: () => Promise<void>
    webkitRequestFullscreen?: () => Promise<void>
  }
  try {
    if (!document.fullscreenElement) {
      if (root.requestFullscreen) await root.requestFullscreen()
      else if (root.webkitRequestFullscreen) await root.webkitRequestFullscreen()
    }
  } catch {
    // iOS Safari often blocks this outside standalone; CSS immersive still helps.
  }

  // Nudge mobile browser chrome to collapse when fullscreen is unavailable.
  if (window.scrollY < 2) {
    window.scrollTo(0, 1)
  }
}

export async function exitImmersiveLandscape(): Promise<void> {
  docEl().classList.remove('immersive-mobile')
  document.body.classList.remove('immersive-mobile')
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen()
    }
  } catch {
    // Ignore.
  }
}
