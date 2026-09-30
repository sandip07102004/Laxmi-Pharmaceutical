# Laxmi Pharma — Design System & Specification

## Design System: Clinical Botanics
*Stitch Project: `projects/1224735909581497217`*

---
name: Clinical Botanics
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#3e4947'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#6e7977'
  outline-variant: '#bdc9c6'
  surface-tint: '#006a63'
  primary: '#005c55'
  on-primary: '#ffffff'
  primary-container: '#0f766e'
  on-primary-container: '#a3faef'
  inverse-primary: '#80d5cb'
  secondary: '#006c49'
  on-secondary: '#ffffff'
  secondary-container: '#6cf8bb'
  on-secondary-container: '#00714d'
  tertiary: '#7d4200'
  on-tertiary: '#ffffff'
  tertiary-container: '#a15600'
  on-tertiary-container: '#ffe6d5'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#9cf2e8'
  primary-fixed-dim: '#80d5cb'
  on-primary-fixed: '#00201d'
  on-primary-fixed-variant: '#00504a'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffdcc3'
  tertiary-fixed-dim: '#ffb77d'
  on-tertiary-fixed: '#2f1500'
  on-tertiary-fixed-variant: '#6e3900'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.015em
  headline-xl-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 26px
    fontWeight: '600'
    lineHeight: 34px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
  body-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 15px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 18px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  space-2xs: 0.25rem
  space-xs: 0.5rem
  space-sm: 0.75rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
  space-2xl: 3rem
  space-3xl: 4rem
  space-4xl: 6rem
  gutter-mobile: 1rem
  gutter-tablet: 1.5rem
  gutter-desktop: 2rem
  margin-mobile: 1rem
  margin-tablet: 2rem
  margin-desktop: 3rem
---

## Brand & Style

This design system establishes a digital environment rooted in clinical rigor, apothecary heritage, and contemporary holistic care. The interface serves a multi-generational audience ranging from seniors managing chronic medication to younger demographics seeking proactive nutritional health. 

The aesthetic marries **Corporate / Modern** precision with soft **Tactile & Organic** affordances:
- **Emotional Resonance:** Calm assurance, patient dignity, uncompromised medical safety, and organic vitality.
- **Visual Stance:** Generous whitespace, high-legibility typographic hierarchies, ultra-soft diffused ambient shadows, and pill-shaped touch surfaces that feel welcoming rather than sterile.
- **Accessibility:** Strictly AAA compliant for primary actions and body content, optimized for motor impairment through generous minimum target dimensions (48px absolute minimum).

## Colors

The palette balances restorative botanical undertones with pharmaceutical authority.

- **Primary (`#0F766E` / Deep Emerald Teal):** Signifies clinical trust, diagnostic reliability, and calm authority. Used for primary CTAs, active states, key interactive indicators, and institutional branding elements.
- **Secondary (`#10B981` / Herbal Sage):** Reflects organic renewal, safety confirmations, and wellness lifestyle integrations. Reserved for success alerts, secondary actions, refill verifications, and holistic product categories.
- **Tertiary (`#D97706` / Warm Amber):** Denotes therapeutic alerts, critical dosage warnings, pending prescription updates, and urgent pharmacy notifications without inducing panic.
- **Neutral (`#0F172A` / Deep Slate):** Anchors high-contrast readability across all typography and structural iconography, completely avoiding pure black to minimize eye strain.
- **Surface Foundations:** Background layers blend warm mint-tinted neutrals (`#F0FDF4`) and pristine slate creams (`#F8FAFC`) to evoke a clean, tranquil apothecary environment.

## Typography

The type system relies on **Plus Jakarta Sans** across all levels, utilizing its open counters, humanist terminals, and robust geometric underpinnings to optimize immediate legibility for users with visual fatigue or age-related impairments.

- **Legibility Rules:** Body copy defaults to `body-lg` (16px) or `body-xl` (18px) within dosage directions, drug interaction notices, and clinical instructions. Text never falls below 13px (`body-sm`) for legal/medical disclaimers.
- **Rhythm & Optical Weight:** Headlines utilize semi-bold and bold weights with subtle negative tracking (`-0.01em` to `-0.02em`) to maintain presence against crisp white backgrounds. Labels leverage slight positive tracking to ensure uppercase metadata and status pills remain legible at a glance.

## Layout & Spacing

This design system uses a responsive fluid grid structure with an 8pt spatial baseline cadence, enforcing rhythmic predictability:

- **Desktop (1024px+):** 12-column layout, max-width `1280px`, `gutter-desktop` (32px), and outer margins scaling dynamically with viewport width.
- **Tablet (640px - 1023px):** 8-column layout, `gutter-tablet` (24px), and `margin-tablet` (32px).
- **Mobile (<640px):** 4-column layout, `gutter-mobile` (16px), and `margin-mobile` (16px) with single-column linear stacking for prescription management and checkout flows.
- **Touch-First Accessibility:** All interactive elements maintain a minimum target size of 48px × 48px with a minimum 8px boundary buffer between clickable elements.

## Elevation & Depth

Visual hierarchy uses **tonal layering** and **ambient herbal-tinted drop shadows** to produce a clean, clinical, yet approachable depth map:

- **Surface Levels:**
  - `Base`: Tinted background canvas (`#F8FAFC` to `#F0FDF4`).
  - `Surface 1 (Cards & Modules)`: Pure white (`#FFFFFF`) with a subtle border outline (`rgba(15, 118, 110, 0.08)`) and ambient shadow `0 2px 8px -2px rgba(15, 23, 42, 0.04)`.
  - `Surface 2 (Interactive Floating Elements / Dropdowns)`: `#FFFFFF` paired with an elevated ambient shadow `0 12px 24px -6px rgba(15, 118, 110, 0.08), 0 4px 8px -2px rgba(15, 23, 42, 0.03)`.
  - `Surface 3 (Modals / Emergency Dialogs)`: Elevated atop an emerald backdrop veil (`rgba(15, 23, 42, 0.5)`) with an outer glow and deep blur shadow `0 24px 48px -12px rgba(15, 118, 110, 0.16)`.
- **Borders & Dividers:** Subtle, low-contrast dividers using `rgba(15, 118, 110, 0.1)` define boundaries without creating visual noise for cognitive ease.

## Shapes

The design system employs a **Level 2 (Rounded)** shape philosophy, scaling up to full pill shapes for interactive focal points:

- **Cards and Containers:** `rounded-lg` (16px / 1rem) creates a safe, modern boundary that softens the clinical aesthetic.
- **Interactive Buttons & Badges:** `rounded-full` (9999px pill shapes) communicate friendly, touch-encouraging surfaces reminiscent of therapeutic medicine capsules.
- **Form Controls & Modals:** Standardized with `rounded-md` (8px / 0.5rem) to `rounded-lg` (16px / 1rem), preserving structural discipline and clear content containment.

## Components

### Buttons
- **Primary:** Full pill (`rounded-full`), deep emerald teal background (`#0F766E`), white text (`#FFFFFF`), min-height 52px. Hover state shifts to `#0D655E` with ambient shadow boost. Focus state displays a 3px ring (`rgba(16, 185, 129, 0.4)`).
- **Secondary / Wellness:** Sage herbal outline (`#10B981`, 1.5px border) with mint fill (`rgba(240, 253, 244, 0.6)`) and teal text. 
- **Destructive / Caution:** Warm amber wash with dark amber text (`#B45309`) and crisp warning iconography.

### Chips & Prescription Badges
- **Status Pills:** Pill-shaped (`rounded-full`), height 28px to 32px, featuring an SVG clinical indicator dot:
  - *Active Refill:* Mint background (`#DCFCE7`), text `#15803D`.
  - *Verification Needed:* Warm amber background (`#FEF3C7`), text `#B45309`.
  - *Specialty Care:* Deep teal background (`#CCFBF1`), text `#0F766E`.

### Cards & Care Modules
- Pure white background, 16px radius, subtle perimeter border (`1px solid rgba(15, 118, 110, 0.08)`).
- Clear compartmentalized padding (`space-lg`), separating medication imagery, dosage instructions, and refill timeline tracking.

### Form Inputs & Search
- Generous min-height (52px), 8px border radius, clear dark slate labels above inputs.
- Resting border: `rgba(15, 23, 42, 0.15)`. Focus state: border `#0F766E` with a 3px diffused outer halo (`rgba(15, 118, 110, 0.15)`).
- Direct clear buttons and integrated prescription barcode/camera scanner icon triggers inside inputs.

### Checkboxes & Radio Buttons
- 22px × 22px minimum bounding box with 6px corner radius for checkboxes, full circle for radios.
- In active states, features solid `#0F766E` fill with an optically centered white checkmark or dot, paired with high-contrast label typography.

### Domain-Specific Components
- **Pharmacist Safety Verification Seal:** A dual-ring badge featuring an authenticated lock and prescription icon with supporting text: *"Verified by Licensed Pharmacist."*
- **Dosage Tracker & Refill Stepper:** Segmented visual pill-tracker indicating days remaining, dosage timings (Morning, Noon, Night), and automated 1-click renewal alerts.
