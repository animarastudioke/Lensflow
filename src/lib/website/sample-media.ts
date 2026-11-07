// Stand-in photographs for the builder preview. They are generated, not
// stock images: no licence to track, no network request, and nothing a visitor
// could mistake for the studio's own work. The renderer only uses them in
// preview mode, so a published site never shows them.

const LIGHT = [
  ['#e7e5e4', '#d6d3d1', '#a8a29e'],
  ['#f5e9dc', '#e6d2bd', '#c4a484'],
  ['#e2e8e4', '#c9d6cd', '#8fa596'],
  ['#e8e4ee', '#d3cbe0', '#9d90b5'],
] as const

const DARK = [
  ['#27272a', '#3f3f46', '#52525b'],
  ['#2a2522', '#3d332d', '#5a4a40'],
  ['#222729', '#2f3a3e', '#475a60'],
  ['#262330', '#38334a', '#52496e'],
] as const

/** A soft landscape-style placeholder as an SVG data URI; `variant` picks one of four tints. */
export function samplePhotoSrc(variant: number, dark: boolean): string {
  const palettes = dark ? DARK : LIGHT
  const [sky, hill, ground] = palettes[Math.abs(variant) % palettes.length] ?? palettes[0]
  const ink = dark ? '#ffffff' : '#44403c'
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice">',
    `<rect width="400" height="500" fill="${sky}"/>`,
    `<circle cx="285" cy="150" r="42" fill="${ink}" fill-opacity="0.12"/>`,
    `<path d="M0 340 Q110 250 220 330 T400 300 V500 H0Z" fill="${hill}"/>`,
    `<path d="M0 410 Q140 340 270 410 T400 390 V500 H0Z" fill="${ground}"/>`,
    '</svg>',
  ].join('')
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}
