export type InputState = {
  forward: boolean
  rotateLeft: boolean
  rotateRight: boolean
  fireFront: boolean
  fireLeft: boolean
  fireRight: boolean
  pausePressed: boolean
}

const keys = new Set<string>()
const virtualKeys = new Set<string>()
let pauseWasDown = false

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

export function createInputController() {
  function onKeyDown(event: KeyboardEvent) {
    keys.add(event.code)

    // Avoid scrolling the page with game keys.
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
    pauseWasDown = false
  }

  function clearHeldKeys() {
    keys.clear()
    virtualKeys.clear()
  }

  function read(): InputState {
    const pauseDown =
      isKeyDown('KeyP') || isKeyDown('Escape') || isKeyDown('Pause')
    const pausePressed = pauseDown && !pauseWasDown
    pauseWasDown = pauseDown

    return {
      forward: isKeyDown('KeyW') || isKeyDown('ArrowUp'),
      rotateLeft: isKeyDown('KeyA') || isKeyDown('ArrowLeft'),
      rotateRight: isKeyDown('KeyD') || isKeyDown('ArrowRight'),
      fireFront: isKeyDown('Space') || isKeyDown('KeyJ'),
      fireLeft: isKeyDown('KeyQ') || isKeyDown('KeyK'),
      fireRight: isKeyDown('KeyE') || isKeyDown('KeyL'),
      pausePressed,
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
