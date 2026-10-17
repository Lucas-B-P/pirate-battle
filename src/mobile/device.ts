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

export function preferLiteGraphics(): boolean {
  return isMobileClient()
}

export function renderResolutionCap(): number {
  if (!isMobileClient()) return Math.min(window.devicePixelRatio || 1, 2)
  return Math.min(window.devicePixelRatio || 1, 1.25)
}
