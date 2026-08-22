# LensFlow — Design System

The authoritative visual design reference for LensFlow. This is both a record of what exists in `tailwind.config.ts`/`src/app/globals.css`/`src/components/ui/` today and the set of rules new work should follow. Where this document and a component disagree, treat it as a bug in the component (or in this document, if the component is right and the doc is stale) — file it, don't silently pick one.

---

## 1. Brand direction

LensFlow should feel **premium, editorial, creative, sophisticated, calm, modern, trustworthy, technically polished.**

It should never feel like: a generic SaaS template, excessively rounded, overly colorful, gradient-heavy, gimmicky, crypto/AI-tech styled, or a photography portfolio website (LensFlow is the *tool* photographers run their business on — it should read as considered software, not as another gallery on the internet).

This is not a new visual system — the existing tokens already point in this direction; this section formalizes the direction so future decisions can be checked against it instead of re-litigated:

**The "gallery wall" identity.** Light mode is a cool matte white (never stark white, never warm cream). Dark mode is a tinted charcoal-ink "dim viewing room" (never pure black). The single accent is a deep, desaturated wine-red — described in `globals.css` as a "gallery 'sold' dot / wax-seal red." One accent color, used sparingly, is the entire color strategy. Do not introduce a second accent color, a gradient, or a brighter/more saturated red without a specific, deliberate reason — restraint *is* the premium signal here, not decoration.

**Typography carries the editorial feel.** Spectral (serif, `font-display`) on every heading against Archivo (sans, `font-sans`) for body/UI text is what separates this from a generic SaaS look — most SaaS products use one sans-serif for everything. Keep that pairing. JetBrains Mono is reserved for small tracked-uppercase metadata (`.label-caption`) — a deliberate "museum wall-label" touch, not a general-purpose font.

**Geometry stays simple and restrained.** Low-opacity shadows (`0 0 0 / 0.03–0.15`, never heavy default-Tailwind shadows), a small consistent radius scale (see §4 — nothing rounds past 6px anywhere in the core component set after this pass), and motion that's quick and functional (150–300ms, no bouncy/springy easing) rather than decorative. This is what keeps the product feeling "technically polished" instead of "template."

**The logo is the clearest expression of this direction, and nothing here should contradict it.** `LogoMark` (`src/components/marketing/home/lib/logo.tsx`) is a single-path `currentColor` SVG: a circular seal ring, six curved aperture-blade petals arranged radially (a literal lens iris — "abstract lens/flow concept"), and a solid center dot. It is:
- **Monochrome by construction** — one `currentColor` fill/stroke, no gradient, so it works in `text-primary` (wine-red), pure white on dark surfaces, or any single ink color.
- **Geometrically simple** — six identical petal paths at 60° rotations plus two circles; it reads clearly as a small app icon or a 20px favicon.
- **Restrained** — no color decisions baked into the mark itself; color comes entirely from context (`text-primary` normally, white in dark/photo-overlay contexts).

Any new brand-adjacent visual (icons, illustration style, marketing graphics) should be checked against this: single accent color or monochrome, simple closed geometric shapes, no gradients, no glow/neon effects, no isometric-SaaS-illustration style.

**What this rules out concretely:** multi-color gradients on buttons/headings/backgrounds; neon or saturated accent colors; heavy drop shadows or glassmorphism beyond the one deliberate `.glass` sticky-header treatment; radius above 6px on any core surface; decorative animation (parallax-for-its-own-sake, bouncy springs, particle effects); stock-photography-portfolio framing (large hero photos with light text overlays *of other people's photography as the product's own visual identity* — the product chrome itself should look like software, not like a wedding gallery).

---

## 2. Color palette

All colors are indirect HSL CSS custom properties (`hsl(var(--token))`), defined once in `globals.css` under `:root` (light) and `.dark`, exposed to Tailwind via `tailwind.config.ts`'s `theme.extend.colors`. **Always reach for a token — never hardcode a Tailwind palette color (`red-500`, `green-600`, etc.) in product code.** This was previously violated in `Alert`'s success/destructive/warning variants (raw `green-500`/`red-500`/`yellow-500` with manual `dark:` overrides) and has been fixed to use the existing `success`/`destructive`/`warning` tokens, which already carry correct light/dark values — never re-derive what a token already provides.

| Token | Light (HSL) | Dark (HSL) | Use |
|---|---|---|---|
| `background` / `foreground` | `210 10% 97%` / `220 20% 11%` | `220 18% 9%` / `40 15% 94%` | Page background / default text |
| `card`, `popover` | `0 0% 100%` | `220 16% 12%` | Elevated surfaces |
| `primary` (+ `-foreground`) | `350 62% 30%` | `350 65% 54%` | The one brand accent — CTAs, active states, focus ring |
| `secondary` (+ `-foreground`) | `210 10% 93%` | `220 14% 18%` | Secondary buttons, subtle fills |
| `muted` (+ `-foreground`) | `210 10% 94%` | `220 14% 16%` | De-emphasized text/backgrounds |
| `accent` (+ `-foreground`) | `210 10% 93%` | `220 14% 18%` | Hover states on neutral surfaces |
| `destructive` (+ `-foreground`) | `10 75% 46%` | `8 70% 52%` | Errors, destructive actions |
| `success` / `warning` / `info` (+ `-foreground` each) | `150 45% 26%` / `38 75% 38%` / `210 40% 32%` | `150 40% 46%` / `38 80% 56%` / `210 55% 62%` | Status — always via token, never raw Tailwind color |
| `border` / `input` / `ring` | `210 12% 88%` / `210 12% 85%` / `350 62% 30%` (= `primary`) | `220 14% 20%` / `220 14% 22%` / `350 65% 54%` | Dividers, field borders, focus ring |
| `surface` | `0 0% 100%` | `220 17% 13%` | Reserved elevation token — check usage before adding a new one |

Theme switching: `next-themes`, `class` strategy (`attribute="class"`, `defaultTheme="system"`, `enableSystem`), toggling `.dark` on `<html>`.

**Rule:** the accent (`primary`) is used for one job — the thing the user should act on (primary CTA, active nav/tab state, focus ring, links). If a screen has more than one or two "primary-red" elements competing for attention, that's a signal something should be `secondary`/`outline`/`ghost` instead, not a signal to add a second accent color.

## 3. Typography hierarchy

**Families** (`next/font/google`, loaded in `src/app/layout.tsx`):

| Token | Font | Role |
|---|---|---|
| `font-sans` | Archivo | Body text, UI chrome (applied on `<body>` by default) |
| `font-display` | Spectral | Every heading, site-wide |
| `font-mono` | JetBrains Mono | Tracked-uppercase metadata only (`.label-caption`), tabular numerals |
| `font-heading-playfair` / `-cormorant` / `-bodoni` | Playfair Display / Cormorant Garamond / Bodoni Moda | Gallery cover-page heading font *choice* only (per-gallery `heading_font` setting) — not general site fonts |

**Type scale** (`tailwind.config.ts` `fontSize`, `clamp()`-based where it needs to respond to viewport):

| Token | Size | Line-height | Tracking | Typical use |
|---|---|---|---|---|
| `text-display-xl` | `clamp(2.5rem, 5vw, 4rem)` | 1.1 | -0.02em | Hero H1 |
| `text-display-lg` | `clamp(2rem, 4vw, 3rem)` | 1.15 | -0.01em | Page-level H1 |
| `text-display-md` | `clamp(1.5rem, 3vw, 2.25rem)` | 1.2 | -0.01em | Section H2 |
| `text-display-sm` | `clamp(1.25rem, 2.5vw, 1.75rem)` | 1.25 | 0 | Subsection heading |
| `text-heading-xl` → `-sm` | 1.5rem → 1rem | 1.3 → 1.45 | 0 to -0.01em | Card/dialog/component titles |
| `text-body-lg` / `text-body` / `text-body-sm` | 1.125rem / 1rem / 0.875rem | 1.55–1.6 | 0 | Paragraph copy |
| `text-caption` | 0.75rem | 1.5 | 0.01em | Fine print |

**Use the scale, not raw sizes.** `Card`/`Dialog` titles already do this correctly (`text-heading-lg`). The homepage marketing sections currently don't (hand-set `text-3xl sm:text-5xl` etc. instead of `text-display-md`/`-lg`) — out of scope to fix here (homepage is explicitly untouched in this pass), but any *new* marketing or dashboard UI should use the token scale from the start rather than adding a third convention.

**Practical example:**
```tsx
// Do this
<h2 className="font-display text-display-md font-semibold text-foreground">Section title</h2>
<p className="text-body text-muted-foreground">Supporting copy.</p>

// Not this — hand-picked sizes that don't map to any token
<h2 className="font-display text-[2.1rem] font-semibold">Section title</h2>
```

## 4. Spacing & border-radius

**Spacing:** standard Tailwind scale plus three large section-level tokens: `space-18` (4.5rem), `space-22` (5.5rem), `space-30` (7.5rem). Shared rhythm utilities carry most of the app's actual spacing consistency — prefer these over one-off values:
- `.container-narrow` — `max-w-4xl mx-auto px-4 sm:px-6 lg:px-8`
- `.container-wide` — `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`
- `.page-section` — `py-12 sm:py-16 lg:py-20`

**Border-radius** — formalized in this pass. `--radius: 0.375rem` (6px); `rounded-lg` = 6px, `rounded-md` = 4px (`calc(var(--radius) - 2px)`), `rounded-sm` = 2px (`calc(var(--radius) - 4px)`). Three tiers, each with one job — **don't introduce a fourth:**

| Radius | Use | Examples |
|---|---|---|
| `rounded-sm` (2px) | Tiny inline controls, menu/list items | Checkbox, `DropdownMenuItem`, `SelectItem`, `ContextMenuItem` |
| `rounded-md` (4px) | **The default** — buttons, form fields, cards, all floating menus/popovers/tooltips/alerts/toasts | `Button`, `Input`, `Textarea`, `Select`, `Card`, `DropdownMenuContent`, `Popover`, `HoverCard`, `Tooltip`, `Alert`, `Toast`, `DataTable` |
| `rounded-lg` (6px) | Large modal-style overlays only — the single deliberate exception | `Dialog`, `AlertDialog` |
| `rounded-full` | Pills, avatars, toggles, progress | `Badge`, `Switch`, `Avatar`, `Progress`, `Slider` |

Before this pass, `Textarea`, `SelectTrigger`/`SelectContent`, `Popover`, `HoverCard`, `Tooltip`, `Alert`, `Toast`, `DataTable`'s wrapper, and two raw `<select>` filters had drifted to `rounded-lg` alongside `Button`/`Input`/`Card`/`DropdownMenu` at `rounded-md` — the same category of surface (a form field, or a floating bordered panel) rendering at two different radii for no functional reason. All have been aligned to `rounded-md`; `Dialog`/`AlertDialog` keep `rounded-lg` as the one intentional "bigger surface, slightly bigger radius" exception.

**Known remaining drift, not fixed in this pass** (product-specific compound components, not shared primitives — lower priority, revisit if touched for other reasons): `Dropzone` uses `rounded-xl` (8px, the single largest radius anywhere in the codebase) and `ImageCarousel` uses `rounded-lg` for its chrome. Both are candidates to fold into the `rounded-md` standard next time either is touched.

## 5. Shadows

A 7-step scale, deliberately low-opacity (`rgb(0 0 0 / 0.03–0.15)`, never Tailwind's heavier defaults) — this is part of what keeps the product feeling calm rather than "card floating in space":

`shadow-sm` → `shadow-2xl`, plus `shadow-inner`. `Card` and most surfaces intentionally use **no shadow at all**, relying on a 1px border instead (`.card-hover` — border-color shift on hover, explicitly "no shadow lift," per its own comment). Reach for a shadow only on genuinely elevated/floating surfaces (dropdowns, popovers, dialogs, toasts) — bordered-not-shadowed is the default for anything sitting in the normal document flow.

## 6. Buttons

`src/components/ui/button.tsx` — the only button system in the codebase (see §11). Seven variants (`default`, `destructive`, `outline`, `secondary`, `ghost`, `link`, `success`), five sizes (`sm`/`default`/`lg`/`xl`/`icon`). All variants route through the same `cva` definition, so radius/transition/focus-ring are already consistent across every variant and size — no changes needed here.

**Practical example:**
```tsx
<Button>Save changes</Button>                        {/* primary action */}
<Button variant="outline">Cancel</Button>             {/* secondary action, same screen */}
<Button variant="ghost" size="icon"><X /></Button>    {/* icon-only, low-emphasis */}
<Button variant="destructive">Delete gallery</Button> {/* destructive, needs confirmation elsewhere */}
```
Don't reach for `variant="link"` as a substitute for an `<a>`/`Link` — it's for button-semantics actions that should look like a link, not for navigation.

## 7. Inputs

`Input`, `Textarea`, `Select` — all now share `rounded-md`, `border-input`, the same `focus-visible:ring-2 ring-ring ring-offset-2` treatment, and the same disabled-state opacity. Raw `<select>` elements used inline in `DataTable`/`TableToolbar` (rather than the Radix `Select` component, for lightweight native-select cases) now also match this radius — they intentionally stay native `<select>`s for their specific use case, but should keep visually matching the rest of the input family.

## 8. Cards

`Card`/`CardHeader`/`CardTitle`/`CardDescription`/`CardContent`/`CardFooter` — `rounded-md`, `border-border`, no shadow (border-only elevation, consistent with §5). `CardTitle` correctly uses the `text-heading-lg` token; `CardDescription` uses `text-body-sm`. This is the reference implementation for "use the type scale, don't hand-set sizes" — point to it when reviewing new components.

## 9. Navigation

No single shared `<Nav>` primitive — `Navbar`/`HomeFooter` (homepage-specific, untouched in this pass) and `MarketingShell`'s nav are separate implementations (a known cross-site consistency gap, tracked in `docs/ROADMAP.md`, not addressed here since it requires touching homepage/marketing layout). `NavigationMenu` (`ui/navigation-menu.tsx`) is the Radix-based primitive available for dashboard-side nav needs; it already uses `rounded-md`, consistent with this document's radius rule.

## 10. Section layouts

`.page-section` + `.container-wide`/`.container-narrow` (§4) are the shared rhythm primitives for any full-width page section. New marketing/dashboard sections should compose from these rather than hand-rolling padding. (Existing homepage sections' heading-block duplication — nine sections sharing one identical hand-written className string — is documented in `docs/CURRENT_STATE_AUDIT.md` and left alone here; when the homepage is eventually touched, that's the point to extract a shared `<SectionHeading>` component using the `text-display-md` token from §3 instead of the current hand-set `text-3xl sm:text-5xl`.)

## 11. Motion / animation

`framer-motion` for choreographed reveals (marketing pages), Tailwind's `tailwindcss-animate` + custom keyframes for component-level transitions (Radix primitives — accordion, dialog, dropdown, toast). Timing tokens: `0`–`1000ms` durations, four named easings (`ease-in-out`, `ease-out`, `ease-in`, `expo-out`). Component transitions consistently sit in the 150–300ms range with straightforward eases — no springs, no bounce, no elastic overshoot anywhere in the current set. Keep it that way: motion here signals state change (open/close, hover, loading), not decoration.

## 12. Dark / light mode

`next-themes`, `class` strategy, `defaultTheme="system"`. Every token in §2 has a matched light/dark HSL pair — new colors must always be added as a token pair in `globals.css`, never as a single hardcoded value with a manual `dark:` override scattered in component code (the exact anti-pattern `Alert` had, now fixed). Dark mode is framed explicitly as "a dim viewing room: tinted charcoal-ink, never pure black" — if a new dark-mode background ever needs picking, stay in that charcoal-ink family, don't drop to true black.

---

## 13. Duplicated/dead styling systems (resolved and remaining)

- **Resolved in this pass:** `globals.css` carried a complete second button/input system (`.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-destructive`, `.btn-outline`, `.input-field`, `.label-text`) with **zero usages anywhere in `src/`** — fully dead, contradicting the actually-used `Button`/`Input` components. Removed.
- **Still active and correctly in use** (verified, not dead): `.focus-ring`, `.label-caption`, `.glass` (sticky-header only, per its own comment), `.card-hover`, `.link-underline`, `.container-narrow`, `.container-wide`, `.page-section`, `.text-balance`.
- **Remaining, not addressed in this pass:** homepage's nine-times-repeated section-heading className string (§10); `Dropzone`/`ImageCarousel` radius drift (§4).

---

## How to use this document going forward

Check here before inventing a new spacing value, color, radius, or button/card style. If a genuinely new token is needed, add it to `tailwind.config.ts`/`globals.css` **and** this file together — a token that exists in code but not here (or vice versa) is exactly the kind of drift this pass just cleaned up.
