export type InputState = {
  forward: boolean
  rotateLeft: boolean
  rotateRight: boolean
  fireFront: boolean
  fireLeft: boolean
  fireRight: boolean
  pausePressed: boolean
  /** World-space aim point for the front cannon (mouse / pointer). */
  aimX: number | null
  aimY: number | null
}

const keys = new Set<string>()
const virtualKeys = new Set<string>()
let pauseWasDown = false
let aimX: number | null = null
let aimY: number | null = null
/** Set from the arena canvas only (not HUD / menu clicks). */
let canvasFireHeld = false

function isKeyDown(code: string): boolean {
  return keys.has(code) || virtualKeys.has(code)
}

export function setVirtualKey(code: string, isDown: boolean) {
  if (isDown) {
    virtualKeys.add(code)
  } else {
    virtualKeys.delete(code)
  }
}

/** Update world-space aim used by the front cannon. */
export function setAimPoint(x: number | null, y: number | null) {
  aimX = x
  aimY = y
}

export function setCanvasFireHeld(isDown: boolean) {
  canvasFireHeld = isDown
}

function isFormField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target.isContentEditable ||
    Boolean(target.closest('input, textarea, select, [contenteditable="true"]'))
  )
}

const idleInput: InputState = {
  forward: false,
  rotateLeft: false,
  rotateRight: false,
  fireFront: false,
  fireLeft: false,
  fireRight: false,
  pausePressed: false,
  aimX: null,
  aimY: null,
}

export function createInputController(isGameplayActive: () => boolean = () => true) {
  function onKeyDown(event: KeyboardEvent) {
    if (!isGameplayActive() || isFormField(event.target)) return

    const onButton = event.target instanceof HTMLElement && Boolean(event.target.closest('button, a, [role="dialog"]'))
    if (onButton) return

    keys.add(event.code)

    if (
      event.code === 'Space' ||
      event.code === 'ArrowUp' ||
      event.code === 'ArrowDown' ||
      event.code === 'ArrowLeft' ||
      event.code === 'ArrowRight'
    ) {
      event.preventDefault()
    }
  }

  function onKeyUp(event: KeyboardEvent) {
    keys.delete(event.code)
  }

  function attach() {
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
  }

  function detach() {
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('keyup', onKeyUp)
    keys.clear()
    canvasFireHeld = false
    pauseWasDown = false
  }

  function clearHeldKeys() {
    keys.clear()
    virtualKeys.clear()
    canvasFireHeld = false
  }

  function read(): InputState {
    if (!isGameplayActive()) {
      keys.clear()
      virtualKeys.clear()
      canvasFireHeld = false
      pauseWasDown = false
      return { ...idleInput, aimX, aimY }
    }

    const pauseDown =
      isKeyDown('KeyP') || isKeyDown('Escape') || isKeyDown('Pause')
    const pausePressed = pauseDown && !pauseWasDown
    pauseWasDown = pauseDown

    return {
      forward: isKeyDown('KeyW') || isKeyDown('ArrowUp'),
      rotateLeft: isKeyDown('KeyA') || isKeyDown('ArrowLeft'),
      rotateRight: isKeyDown('KeyD') || isKeyDown('ArrowRight'),
      fireFront:
        isKeyDown('Space') || isKeyDown('KeyJ') || canvasFireHeld,
      fireLeft: isKeyDown('KeyQ') || isKeyDown('KeyK'),
      fireRight: isKeyDown('KeyE') || isKeyDown('KeyL'),
      pausePressed,
      aimX,
      aimY,
    }
  }

  return {
    attach,
    detach,
    clearHeldKeys,
    read,
  }
}

export type InputController = ReturnType<typeof createInputController>
