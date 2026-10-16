import logoUrl from '../assets/logo_jungle_gaming.svg?url'

export function WoodBrand() {
  return (
    <img
      className="wood-brand"
      src={logoUrl}
      alt="Jungle Gaming"
      width={177}
      height={89}
      decoding="async"
    />
  )
}
