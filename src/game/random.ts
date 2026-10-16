/** Simple replaceable random source for reproducible tests. */
let randomSource = Math.random

export function random(): number {
  return randomSource()
}

export function setRandomSource(next: () => number) {
  randomSource = next
}

export function resetRandomSource() {
  randomSource = Math.random
}

/** Deterministic RNG used by Playwright combat tests. */
export function createSeededRandom(seed: number): () => number {
  let value = seed % 2147483647
  if (value <= 0) value += 2147483646

  return () => {
    value = (value * 16807) % 2147483647
    return (value - 1) / 2147483646
  }
}
