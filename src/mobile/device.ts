export function isMobileClient(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(pointer: coarse)').matches ||
    window.matchMedia('(hover: none)').matches ||
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
  )
}

export function isPortrait(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(orientation: portrait)').matches
}

/** True when launched as installed PWA / Add to Home Screen. */
export function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false
  const nav = navigator as Navigator & { standalone?: boolean }
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    nav.standalone === true
  )
}

export function preferLiteGraphics(): boolean {
  return isMobileClient()
}

export function renderResolutionCap(): number {
  if (!isMobileClient()) return Math.min(window.devicePixelRatio || 1, 2)
  // Retina phones: 1× CSS pixels is a large win; wakes stay visible.
  return 1
}

export function renderMaxFps(): number {
  return isMobileClient() ? 45 : 0
}
