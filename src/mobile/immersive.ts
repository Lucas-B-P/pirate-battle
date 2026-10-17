import { isMobileClient, isPortrait, isStandaloneDisplay } from './device'

function docEl(): HTMLElement {
  return document.documentElement
}

function applyVisualViewportSize(): void {
  const vv = window.visualViewport
  const height = vv?.height ?? window.innerHeight
  const width = vv?.width ?? window.innerWidth
  const offsetTop = vv?.offsetTop ?? 0
  const offsetLeft = vv?.offsetLeft ?? 0
  const root = docEl()
  root.style.setProperty('--vv-height', `${Math.round(height)}px`)
  root.style.setProperty('--vv-width', `${Math.round(width)}px`)
  root.style.setProperty('--vv-top', `${Math.round(offsetTop)}px`)
  root.style.setProperty('--vv-left', `${Math.round(offsetLeft)}px`)
}

let viewportBound = false

function bindVisualViewport(): void {
  if (viewportBound) return
  viewportBound = true
  applyVisualViewportSize()
  const vv = window.visualViewport
  vv?.addEventListener('resize', applyVisualViewportSize)
  vv?.addEventListener('scroll', applyVisualViewportSize)
  window.addEventListener('resize', applyVisualViewportSize)
  window.addEventListener('orientationchange', applyVisualViewportSize)
}

async function requestBrowserFullscreen(): Promise<void> {
  const root = docEl() as HTMLElement & {
    requestFullscreen?: (options?: FullscreenOptions) => Promise<void>
    webkitRequestFullscreen?: () => Promise<void>
    webkitRequestFullScreen?: () => Promise<void>
  }

  const already =
    document.fullscreenElement ||
    (document as Document & { webkitFullscreenElement?: Element }).webkitFullscreenElement
  if (already) return

  try {
    if (root.requestFullscreen) {
      await root.requestFullscreen({ navigationUI: 'hide' })
      return
    }
    if (root.webkitRequestFullscreen) {
      await root.webkitRequestFullscreen()
      return
    }
    if (root.webkitRequestFullScreen) {
      await root.webkitRequestFullScreen()
    }
  } catch {
    // iOS Safari in a normal tab cannot leave browser chrome fully.
  }
}

export async function enterImmersiveLandscape(): Promise<void> {
  if (!isMobileClient() || isPortrait()) return

  docEl().classList.add('immersive-mobile')
  document.body.classList.add('immersive-mobile')
  if (isStandaloneDisplay()) {
    docEl().classList.add('immersive-standalone')
  } else {
    docEl().classList.remove('immersive-standalone')
  }

  bindVisualViewport()
  applyVisualViewportSize()

  const orientation = screen.orientation as ScreenOrientation & {
    lock?: (orientation: OrientationLockType) => Promise<void>
  }
  try {
    await orientation.lock?.('landscape')
  } catch {
    // Ignore — overlay / CSS still apply.
  }

  await requestBrowserFullscreen()

  // Nudge mobile browser chrome to collapse when fullscreen is unavailable.
  if (window.scrollY < 2) {
    window.scrollTo(0, 1)
  }
}

export async function exitImmersiveLandscape(): Promise<void> {
  docEl().classList.remove('immersive-mobile', 'immersive-standalone')
  document.body.classList.remove('immersive-mobile')
  docEl().style.removeProperty('--vv-height')
  docEl().style.removeProperty('--vv-width')
  docEl().style.removeProperty('--vv-top')
  docEl().style.removeProperty('--vv-left')
  try {
    const doc = document as Document & {
      webkitExitFullscreen?: () => Promise<void> | void
      webkitCancelFullScreen?: () => Promise<void> | void
    }
    if (document.fullscreenElement) {
      await document.exitFullscreen()
    } else if (doc.webkitExitFullscreen) {
      await doc.webkitExitFullscreen()
    } else if (doc.webkitCancelFullScreen) {
      await doc.webkitCancelFullScreen()
    }
  } catch {
    // Ignore.
  }
}
