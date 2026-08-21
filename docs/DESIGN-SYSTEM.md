# LensFlow — Design System (Current State)

This documents the tokens and primitives that actually exist in `tailwind.config.ts` and `src/app/globals.css` today. It is a reference, not a style guide aspiration — if something below looks unused, that's noted explicitly rather than presented as active guidance.

## Visual identity intent

The color/spacing choices in `globals.css` carry deliberate in-code rationale, worth preserving as-is rather than treating as arbitrary defaults:

- Light background: *"cool matte white, never stark #fff, never warm cream"* (`--background: 210 10% 97%`).
- The single accent color is described as a *"gallery 'sold' dot / wax-seal red"* (`--primary: 350 62% 30%`).
- Dark mode is framed as *"a dim viewing room: tinted charcoal-ink, never pure black"* (`--background: 220 18% 9%`).

This reads as a considered "gallery wall" identity — a photography-portfolio aesthetic, not generic SaaS/shadcn defaults. New UI should respect this framing rather than introducing arbitrary new colors.

## Color tokens

All colors are indirect HSL CSS custom properties (`hsl(var(--token))`), defined once in `globals.css` under `:root` (light) and `.dark`, and exposed to Tailwind via `tailwind.config.ts`'s `theme.extend.colors`.

| Token | Light | Dark | Tailwind class prefix |
|---|---|---|---|
| `background` / `foreground` | `210 10% 97%` / `220 20% 11%` | `220 18% 9%` / `40 15% 94%` | `bg-background`, `text-foreground` |
| `card`, `popover` | `0 0% 100%` | `220 16% 12%` | `bg-card`, `bg-popover` |
| `primary` (+ `-foreground`) | `350 62% 30%` | `350 65% 54%` | `bg-primary`, `text-primary-foreground` |
| `secondary` (+ `-foreground`) | `210 10% 93%` | `220 14% 18%` | `bg-secondary` |
| `muted` (+ `-foreground`) | `210 10% 94%` | `220 14% 16%` | `bg-muted`, `text-muted-foreground` |
| `accent` (+ `-foreground`) | `210 10% 93%` | `220 14% 18%` | `bg-accent` |
| `destructive` (+ `-foreground`) | `10 75% 46%` | `8 70% 52%` | `bg-destructive` |
| `success` / `warning` / `info` (each + `-foreground`) | `150 45% 26%` / `38 75% 38%` / `210 40% 32%` | `150 40% 46%` / `38 80% 56%` / `210 55% 62%` | `bg-success`, `text-warning`, etc. |
| `border` / `input` / `ring` | `210 12% 88%` / `210 12% 85%` / `350 62% 30%` (= `primary`) | `220 14% 20%` / `220 14% 22%` / `350 65% 54%` | `border-border`, `ring-ring` |
| `surface` | `0 0% 100%` | `220 17% 13%` | `bg-surface` |

Theme switching is handled by `next-themes` using the `class` strategy (`attribute="class"`, `defaultTheme="system"`, `enableSystem` — `src/app/providers.tsx`), toggling the `.dark` class on `<html>`.

## Typography

**Font families** (`tailwind.config.ts` `fontFamily`, loaded via `next/font/google` in `src/app/layout.tsx`):

| Token | Font | CSS variable | Actual usage |
|---|---|---|---|
| `font-sans` | Archivo | `--font-sans` | Body/UI default (applied on `<body>`) |
| `font-display` | Spectral | `--font-display` | Every heading site-wide |
| `font-mono` | JetBrains Mono | `--font-mono` | Eyebrow/label microcopy, tabular numerics |
| `font-heading-playfair` | Playfair Display | `--font-heading-playfair` | Gallery cover-page heading font choice only (`heading_font = 'playfair'`) |
| `font-heading-cormorant` | Cormorant Garamond | `--font-heading-cormorant` | Gallery cover-page heading font choice only |
| `font-heading-bodoni` | Bodoni Moda | `--font-heading-bodoni` | Gallery cover-page heading font choice only |

The three `heading-*` fonts exist specifically for the per-gallery cover-typography feature (`GalleryCoverPreview`, migration `030_gallery_heading_font.sql`) — they are not general-purpose site fonts and are loaded globally in the root layout regardless of whether a given page uses them, since `next/font/google` fonts must be declared statically.

**Type scale** (`tailwind.config.ts` `fontSize`, all `clamp()`-based where they need to scale with viewport):

| Token | Size | Line-height | Letter-spacing |
|---|---|---|---|
| `text-display-xl` | `clamp(2.5rem, 5vw, 4rem)` | 1.1 | -0.02em |
| `text-display-lg` | `clamp(2rem, 4vw, 3rem)` | 1.15 | -0.01em |
| `text-display-md` | `clamp(1.5rem, 3vw, 2.25rem)` | 1.2 | -0.01em |
| `text-display-sm` | `clamp(1.25rem, 2.5vw, 1.75rem)` | 1.25 | 0 |
| `text-heading-xl` | 1.5rem | 1.3 | -0.01em |
| `text-heading-lg` | 1.25rem | 1.35 | 0 |
| `text-heading-md` | 1.125rem | 1.4 | 0 |
| `text-heading-sm` | 1rem | 1.45 | 0 |
| `text-body-lg` | 1.125rem | 1.6 | 0 |
| `text-body` | 1rem | 1.6 | 0 |
| `text-body-sm` | 0.875rem | 1.55 | 0 |
| `text-caption` | 0.75rem | 1.5 | 0.01em |

**Note:** this scale is well-formed but not universally adopted — some surfaces (confirmed: the homepage marketing sections) hand-set raw Tailwind sizes (`text-3xl sm:text-5xl`, etc.) instead of using these tokens. Prefer the tokens for any new work; don't add a third ad-hoc sizing convention.

## Spacing

Standard Tailwind spacing scale, plus three custom large-gap tokens: `space-18` (4.5rem), `space-22` (5.5rem), `space-30` (7.5rem) — intended for generous section-level spacing beyond Tailwind's default scale.

Shared layout rhythm utilities (`@layer components` in `globals.css`):
- `.container-narrow` — `max-w-4xl mx-auto px-4 sm:px-6 lg:px-8`
- `.container-wide` — `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`
- `.page-section` — `py-12 sm:py-16 lg:py-20`

These three utilities carry the majority of the app's actual responsive spacing consistency — prefer them over one-off padding/margin values on new sections.

## Border radius, shadows, motion

- `--radius: 0.375rem` (light and dark), with `rounded-lg`/`-md`/`-sm` deriving from it via `calc()`.
- A 7-step shadow scale (`shadow-sm` through `shadow-2xl`, plus `shadow-inner`) using low, consistent opacity (`rgb(0 0 0 / 0.03–0.15)`) rather than heavy default Tailwind shadows.
- Transition durations `0`–`1000`ms and 4 named easings (`ease-in-out`, `ease-out`, `ease-in`, `expo-out`) are defined as tokens.
- A full keyframe/animation set backs `tailwindcss-animate` (accordion open/close, fade, slide-in from all 4 directions, zoom, `pulse-subtle`, `spin-slow`) — used by Radix-based components (accordion, dialog, dropdown, etc.).

## Component primitives

`src/components/ui/` (39 files) is a shadcn/ui-style primitive layer built on Radix UI + `class-variance-authority` + `tailwind-merge`. This is the actual, actively-used component system — `ui/button.tsx`, `ui/dialog.tsx`, `ui/input.tsx`, etc.

**A second, parallel button/input system also exists** as hand-rolled utility classes in `globals.css`'s `@layer components`: `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-destructive`, `.btn-outline`, `.input-field`, `.label-text`, `.focus-ring`. **Verified: these classes are defined but have zero references anywhere in `src/`** — fully unused, not a parallel-but-active pattern. Don't build new UI against them without first deciding whether to actually adopt this system or remove it; as of today, `src/components/ui/*` is the only pattern in real use.

Other notable utility classes actually in use:
- `.label-caption` — *"museum wall-label caption: tracked small caps for metadata"* (`font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground`) — used across marketing section eyebrows.
- `.glass` — sticky-header-only backdrop-blur effect, explicitly commented as reserved for that one use case, not general decoration.
- `.card-hover` — border-color-shift-on-hover instead of a shadow lift, matching the low-shadow visual language above.
- `.link-underline` — animated underline-on-hover for inline links.
- `.focus-ring` — the shared focus-visible ring treatment (also inlined directly in several `ui/*` components rather than always using this class — check both).

## What to do with this doc going forward

Treat this file as the single reference for "what tokens exist" — when adding new UI, check here first before inventing a new spacing value, color, or button style. If a genuinely new token is needed, add it to `tailwind.config.ts`/`globals.css` and this file together, not just one of the three.
