---
name: Home Portal
description: A refined live launcher for home-server services.
colors:
  signal-blue: "#70a7ff"
  signal-blue-strong: "#9fc4ff"
  signal-blue-light: "#1768e5"
  live-green: "#67d391"
  night-ground: "#0c0e12"
  night-surface: "#14171d"
  night-surface-raised: "#1a1e26"
  night-text: "#f3f5f7"
  night-muted: "#9ba5b3"
  night-subtle: "#858f9d"
  night-line: "#2a303a"
  night-line-strong: "#3a4350"
  day-ground: "#f3f5f7"
  day-surface: "#ffffff"
  day-text: "#151820"
  day-muted: "#5e6876"
  day-subtle: "#65707e"
  day-line: "#dce1e7"
  day-line-strong: "#c7ced8"
typography:
  display:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "3.65rem"
    fontWeight: 740
    lineHeight: 1.01
    letterSpacing: "-0.04em"
  title:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "0.98rem"
    fontWeight: 720
    lineHeight: 1.3
    letterSpacing: "-0.015em"
  body:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "15px"
    lineHeight: 1.5
  label:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "0.76rem"
    fontWeight: 650
rounded:
  compact: "10px"
  control: "12px"
  surface: "14px"
  status: "999px"
spacing:
  xs: "6px"
  sm: "12px"
  md: "18px"
  lg: "36px"
  xl: "72px"
components:
  control:
    backgroundColor: "{colors.night-surface}"
    textColor: "{colors.night-text}"
    rounded: "{rounded.control}"
    height: "48px"
  service-card:
    backgroundColor: "{colors.night-surface}"
    textColor: "{colors.night-text}"
    rounded: "{rounded.surface}"
    padding: "18px"
  status-chip:
    backgroundColor: "{colors.night-ground}"
    textColor: "{colors.night-text}"
    rounded: "{rounded.status}"
    padding: "4px 9px"
---

# Design System: Home Portal

## Overview

**Creative North Star: "The Signal Cabinet"**

Home Portal borrows the order and confidence of a labeled network cabinet: every service has a defined place, every state reads at a glance, and color behaves like a signal rather than decoration. The compact directory keeps the live inventory in the first viewport and stays quiet enough to remain open all day.

The system is compact, rectilinear, and precise without feeling severe. Softly curved corners and controlled elevation keep the technical structure approachable on touch devices.

**Key Characteristics:**

- Graphite and paper-neutral foundations with one restrained blue signal color.
- Live data is grouped by category and presented before decoration.
- Service-specific accent colors stay inside service identity and fallback artwork.
- Light and dark themes share the same hierarchy and component geometry.

## Colors

The palette uses neutral layers for structure, signal blue for actions and focus, and live green only for availability. Service colors come from runtime data and must remain local to their service card.

### Primary

- **Signal Blue:** The interaction color for links, focus, and active controls. It is deliberately sparse so it retains operational meaning.

### Neutral

- **Night Ground / Night Surface / Raised Night Surface:** The dark-theme depth stack from page to card to supporting region.
- **Day Ground / Day Surface:** The light-theme depth stack, separated with borders rather than decorative shadows.
- **Night Text / Day Text:** Primary copy and control labels.
- **Night Muted / Day Muted:** Supporting metadata that must remain readable.

### Named Rules

**The Signal Economy Rule.** Global accent color marks actions, focus, and state only. Runtime service colors identify services and do not spread into the page chrome.

**The Theme Parity Rule.** Light and dark themes preserve hierarchy, contrast, and component geometry; neither theme is a simplified alternative.

## Typography

**Display Font:** The native system UI sans stack.
**Body Font:** The native system UI sans stack.
**Label/Mono Font:** The system monospace stack is reserved for the single keyboard shortcut hint.

**Character:** One practical sans family carries the interface. Weight, size, and spacing establish hierarchy; labels do not rely on all-caps styling.

### Hierarchy

- **Display** (740, 3.65rem, 1.01): One concise page statement on desktop; 2.35rem on small screens.
- **Title** (720, 0.98rem, 1.3): Service names.
- **Body** (regular, 15px, 1.5): Descriptive and supporting copy with a readable measure.
- **Label** (620–740, 0.68–0.82rem): Counts, route descriptions, status, and control labels.

### Named Rules

**The Recognition Rule.** Service names are the strongest text inside cards; container and route details remain secondary but fully legible.

## Layout

The page uses a centered 1240px maximum-width shell with 32px outer gutters on desktop, 20px on tablet, and 14px on mobile. A compact directory heading pairs with live inventory totals. Controls form one horizontal row and keep search dominant, followed by a horizontally scrollable runtime category filter.

All services share one continuous grid so sparse categories never create empty rows. Reachable web apps sort first and background processes last; category remains visible on every card and filterable without changing the real totals. Cards use three columns above 900px, two columns between 581px and 900px, and one column at 580px and below. Responsive changes are structural: controls compress, nonessential timestamps recede, and cards retain their usable internal spacing.

## Elevation & Depth

The system is flat by default. Borders and tonal layers carry structure at rest; a soft ambient shadow appears only when a card lifts on hover.

### Shadow Vocabulary

- **Card Hover** (`0 18px 48px rgba(0, 0, 0, 0.28)` in dark mode): Momentary depth feedback for pointer users, softened in light mode.

### Named Rules

**The Flat-at-Rest Rule.** Static surfaces use either a border or a tonal step. Elevation is interaction feedback rather than permanent decoration.

## Shapes

Primary surfaces use gently curved 14px corners, compact controls use 12px, and identity tiles use 10px. Status is the only fully pill-shaped component because it is a short, bounded label. Icons use a consistent 1.7px outline stroke with round caps and joins.

## Components

### Buttons

- **Shape:** Compact rounded controls with a 12px radius and a 46–48px touch target.
- **Default:** Neutral surface, one-pixel border, primary text.
- **Hover / Focus:** A stronger neutral border on hover and a two-pixel signal-blue focus outline with three-pixel offset.
- **Disabled / Loading:** Reduced opacity, wait cursor, and a rotating refresh icon that stops under reduced motion.

### Cards / Containers

- **Corner Style:** Gently curved 14px surfaces.
- **Background:** Theme surface with a one-pixel neutral border.
- **Shadow Strategy:** Flat at rest; soft lift on hover.
- **Internal Padding:** 18px below a 116–128px preview or identity field.
- **State:** A compact high-contrast status chip overlays the art region. Preview failures fall back to generated service initials and signal geometry.

### Inputs / Fields

- **Style:** Full-width neutral field, one-pixel border, 14px radius, and a clear search icon.
- **Focus:** Accent border plus a restrained three-pixel focus halo.
- **Keyboard:** The slash key focuses search outside other typing contexts.

### Navigation

The masthead contains a simple home identity, live-inventory state, and theme control. It remains one row on mobile while the textual live indicator yields space.

### Category Filter

Runtime categories appear as compact filter chips with an All default. Chips never introduce synthetic categories or counts, and search still considers every service within the active scope.

## Do's and Don'ts

### Do:

- **Do** derive names, categories, colors, status, previews, and links from runtime data.
- **Do** keep controls familiar, keyboard accessible, and at least 40px square.
- **Do** preserve graceful fallbacks for missing previews, favicons, metadata, and web endpoints.
- **Do** use status color together with text, never as the only signal.

### Don't:

- **Don't** place personal domains, addresses, credentials, or example services in public UI source.
- **Don't** use accent colors as ambient decoration or large background washes.
- **Don't** add external fonts, icon services, analytics, or tracking.
- **Don't** turn the launcher into a monitoring dashboard with invented health metrics.
