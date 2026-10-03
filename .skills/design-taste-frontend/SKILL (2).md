# SKILL: design-taste-frontend
# AUTHOR: Leonxlnx / Taste-Skill
# VERSION: 2.0.0
# PURPOSE: Enforce anti-slop, high-taste, intentional, and polished frontend UI designs.

---

## 🎯 DOCTRINE OF DESIGN TASTE

AI coding assistants default to generic, template-like visual code ("UI slop")—characterized by uninspired centered heroes, default Inter body fonts, uniform 1rem padding, flat buttons, and repetitive card grids.

This skill forces the agent to demonstrate intentional design judgment across **Typography**, **Color Systems**, **Spatial Density**, **Elevation & Depth**, and **Micro-Interactions**.

---

## 🚨 CORE MECHANICAL RULES

### 1. Typography Discipline & Font Pairing
- **Never use default system sans-serif everywhere.** Match typography to the domain:
  - *Legal / Premium Corporate / Luxury*: Pair an authoritative serif (`Playfair Display`, `Cinzel`, `Newsreader`) or sleek display sans (`Plus Jakarta Sans`, `Outfit`) for headings with high-legibility sans (`Inter`, `SF Pro`) for body/data tables.
  - *Tech / SaaS / Modern*: Combine heavy geometric headers (`Plus Jakarta Sans`, `Cabinet Grotesk`) with precise monospace tags (`Fira Code`, `JetBrains Mono`).
- **Strict Hierarchy & Tracking**:
  - H1 / Display headers: `letter-spacing: -0.03em; line-height: 1.15; font-weight: 700;`
  - Small uppercase badges/labels: `letter-spacing: 0.08em; text-transform: uppercase; font-size: 0.72rem; font-weight: 700;`
  - Tabular numbers for financials/metrics: `font-variant-numeric: tabular-nums;`

### 2. Color System & Contrast Balance
- **Avoid Plain Primaries**: Never use pure red (`#ff0000`), blue (`#0000ff`), or plain slate gray. Use tailored, rich HSL color spaces.
- **Surface Elevation Layers**:
  - `var(--bg-app)`: Deep slate tinted canvas `#f8fafc` or midnight dark `#090d16`.
  - `var(--bg-card)`: Pure white `#ffffff` with subtle 1px border `rgba(226, 232, 240, 0.8)` or translucent dark glass `rgba(15, 23, 42, 0.75)` with `backdrop-filter: blur(16px)`.
- **Status Indicators**: Status badges MUST feature dual-layer styling: soft translucent background tint, crisp border, high-contrast text, and a glowing status dot indicator.

### 3. Spatial Density & Layout Variance
- **Avoid Monotonous Grids**: Break identical 3-card card grids. Use asymmetrical feature cards, hero callout banners, and split master-detail layouts.
- **Intentional Padding Dial**:
  - High Density (Tables, Dashboards): Compact padding (`0.75rem 1rem`), 12px-13px text, clear dividers.
  - Generous Focus (Cards, Hero Banners): Spacious padding (`1.75rem 2rem`), clear visual anchors.

### 4. Depth, Glassmorphism & Elevation
- **Layered Shadows**: Combine multi-tier ambient drop-shadows with subtle top-highlight borders (`border-top: 1px solid rgba(255, 255, 255, 0.6)` on light cards).
- **Gradients**: Use smooth sub-30deg linear gradients with subtle opacity stops for primary buttons, accent highlights, and active sidebar items.

### 5. Micro-Interactions & Animation Polish
- **Easing**: Use smooth custom cubic-bezier timing curves: `transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1)`.
- **Hover Feedback**:
  - Cards: `transform: translateY(-2px); box-shadow: 0 12px 24px -6px rgba(15, 23, 42, 0.12);`
  - Buttons: Slight brightness boost, active scale down `transform: scale(0.98)` on click.
- **Status Animations**: Pulsing subtle glowing rings for current active workflow stages and live status tags.

---

## 🎨 TASTE-SKILL DIALS

Adjust design dials depending on context:
1. **Variance Dial**: Low (standard dashboard) ↔ High (editorial, custom onboarding).
2. **Motion Dial**: Subtle micro-interactions, springy hover transitions, zero layout jank.
3. **Density Dial**: Tight tabular data density vs spacious executive overview cards.
