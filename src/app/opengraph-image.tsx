import { ImageResponse } from 'next/og'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const BLADE = 'M50,50 C44,40 44,24 50,16 C55,25 54,40 50,50 Z'

function markSvg() {
  const blades = [0, 60, 120, 180, 240, 300]
    .map((r) => `<path d="${BLADE}" transform="rotate(${r} 50 50)" />`)
    .join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <circle cx="50" cy="50" r="44" fill="none" stroke="#ffffff" stroke-width="4" />
    <g fill="#ffffff">${blades}</g>
    <circle cx="50" cy="50" r="6.5" fill="#ffffff" />
  </svg>`
}

// Same brand mark used everywhere else (LogoMark, icon.svg, apple-icon.tsx),
// rendered in white on the dark background this social-card format needs —
// this file replaces a previously-referenced /og-default.png that never
// actually existed in the repo (a broken social-share image).
export default function OpengraphImage() {
  const dataUri = `data:image/svg+xml;base64,${Buffer.from(markSvg()).toString('base64')}`

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0c0c0f',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={dataUri} width={96} height={96} alt="" />
        <div
          style={{
            marginTop: 32,
            fontSize: 64,
            fontWeight: 600,
            color: '#f7f7f8',
            letterSpacing: '-0.02em',
          }}
        >
          LensFlow
        </div>
        <div
          style={{
            marginTop: 16,
            fontSize: 28,
            color: 'rgba(247, 247, 248, 0.65)',
            letterSpacing: '0.01em',
          }}
        >
          The business platform for photographers &amp; videographers
        </div>
      </div>
    ),
    { ...size }
  )
}
