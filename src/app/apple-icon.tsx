import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

const BLADE = 'M50,50 C44,40 44,24 50,16 C55,25 54,40 50,50 Z'

function markSvg() {
  const blades = [0, 60, 120, 180, 240, 300]
    .map((r) => `<path d="${BLADE}" transform="rotate(${r} 50 50)" />`)
    .join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <rect width="100" height="100" fill="#F7F7F8" />
    <circle cx="50" cy="50" r="44" fill="none" stroke="#7C1D2D" stroke-width="4" />
    <g fill="#7C1D2D">${blades}</g>
    <circle cx="50" cy="50" r="6.5" fill="#7C1D2D" />
  </svg>`
}

export default function AppleIcon() {
  const dataUri = `data:image/svg+xml;base64,${Buffer.from(markSvg()).toString('base64')}`

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={dataUri} width={size.width} height={size.height} alt="" />
      </div>
    ),
    { ...size }
  )
}
