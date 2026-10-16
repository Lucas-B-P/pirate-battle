import { useEffect, useState } from 'react'
import { assetUrl } from '../assetUrl'

const DEFAULT_BACKDROPS = [
  'assets/bg/pirate_cove_1.jpg',
  'assets/bg/pirate_cove_2.jpg',
  'assets/bg/pirate_cove_3.jpg',
  'assets/bg/pirate_cove_4.png',
] as const

type ZoomBackdropProps = {
  images?: readonly string[]
  intervalMs?: number
  dim?: boolean
}

export function ZoomBackdrop({
  images = DEFAULT_BACKDROPS,
  intervalMs = 9000,
  dim = true,
}: ZoomBackdropProps) {
  const [active, setActive] = useState(0)

  useEffect(() => {
    if (images.length <= 1) return
    const id = window.setInterval(() => {
      setActive((current) => (current + 1) % images.length)
    }, intervalMs)
    return () => window.clearInterval(id)
  }, [images, intervalMs])

  return (
    <>
      {images.map((src, index) => (
        <div
          key={src}
          className={`wood-stage__bg wood-stage__bg--zoom ${
            index === active ? 'is-active' : ''
          }`}
          style={{ backgroundImage: `url(${assetUrl(src)})` }}
          aria-hidden="true"
        />
      ))}
      {dim ? <div className="wood-stage__dim" aria-hidden="true" /> : null}
    </>
  )
}
