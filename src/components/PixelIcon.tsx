import { iconURL, type IconName } from './pixelArt'

interface Props {
  name: IconName
  /** size of one icon pixel in CSS px */
  scale?: number
  tint?: string
  className?: string
  label?: string
}

export function PixelIcon({ name, scale = 3, tint, className = '', label }: Props) {
  const { url, w, h } = iconURL(name, tint)
  return (
    <img
      src={url}
      width={w * scale}
      height={h * scale}
      className={`pix-icon ${className}`}
      alt={label ?? ''}
      aria-hidden={label ? undefined : true}
      draggable={false}
    />
  )
}
