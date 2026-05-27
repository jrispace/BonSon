---
name: BonSon
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#3a3939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#b9cacb'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#849495'
  outline-variant: '#3a494b'
  surface-tint: '#00dbe7'
  primary: '#e1fdff'
  on-primary: '#00363a'
  primary-container: '#00f2ff'
  on-primary-container: '#006a71'
  inverse-primary: '#00696f'
  secondary: '#dcb8ff'
  on-secondary: '#480081'
  secondary-container: '#7701d0'
  on-secondary-container: '#dcb7ff'
  tertiary: '#fff5f0'
  on-tertiary: '#4d2600'
  tertiary-container: '#ffd2b1'
  on-tertiary-container: '#924e00'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#74f5ff'
  primary-fixed-dim: '#00dbe7'
  on-primary-fixed: '#002022'
  on-primary-fixed-variant: '#004f54'
  secondary-fixed: '#efdbff'
  secondary-fixed-dim: '#dcb8ff'
  on-secondary-fixed: '#2c0051'
  on-secondary-fixed-variant: '#6700b5'
  tertiary-fixed: '#ffdcc3'
  tertiary-fixed-dim: '#ffb77d'
  on-tertiary-fixed: '#2f1500'
  on-tertiary-fixed-variant: '#6e3900'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
typography:
  display-lg:
    fontFamily: Geist
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Geist
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-mono:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-caps:
    fontFamily: Inter
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 12px
    letterSpacing: 0.1em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 12px
  panel-padding: 20px
  track-height-sm: 40px
  track-height-md: 64px
  sidebar-width: 280px
---

## Brand & Style

The design system is engineered to transform the technical process of music production into an immersive, cinematic experience. It targets professional composers and producers who view their software as an extension of their instrument. The aesthetic is "Studio-Grade Minimalism," blending high-end hardware tactile cues with modern digital interfaces.

The UI avoids the cluttered, spreadsheet-like density of traditional engineering software, opting instead for a **Glassmorphic** approach. Surfaces feel deep and layered, utilizing frosted glass effects and vibrant background blurs to maintain a sense of space and focus. The emotional response should be one of "effortless flow"—a dark, focused environment where the creative output is the only thing that glows.

## Colors

The palette is anchored in a **Deep Matte Black** (#0A0A0A) to eliminate visual fatigue during long studio sessions. 

- **Primary (Neon Blue):** Reserved for active states, playback playheads, and essential interactive nodes. It represents "current focus."
- **Secondary (Ambient Purple):** Used for soft glows, background depth, and secondary logic groupings (e.g., MIDI regions).
- **Tertiary (Warm Orange):** Specifically designated for high-energy information—audio peaks, recording states, and critical warnings.
- **Surface (Charcoal Gray):** Used for panel containers (#1A1A1A) to provide subtle contrast against the true black background.

## Typography

This design system utilizes a trio of typefaces to balance modern aesthetics with technical precision. 

**Geist** is used for display and headlines, providing a sharp, technical, yet premium feel. **Inter** handles all standard body text and interface controls for maximum legibility across dense layouts. **JetBrains Mono** is employed for timecodes, frequency values, and DB meters, ensuring that numerical data aligns perfectly and feels "instrument-grade." All labels use high-tracking caps or monospaced numerals to maintain a clean, organized hierarchy.

## Layout & Spacing

The layout follows a **Hybrid Fluid-Modular** approach. The timeline and mixer areas are fluid, expanding to fill available screen real estate, while inspector panels and browser sidebars occupy fixed-width containers.

A strict 4px baseline grid ensures alignment across various plugin windows and track lanes. Spacing is intentionally generous around primary transport controls to prevent accidental clicks, while being tightly optimized within the mixer strips to allow for high channel visibility. High-use areas (like the Arrangement View) utilize a 12px gutter between track headers and the timeline to create a clear "break" in the glass surfaces.

## Elevation & Depth

Depth is communicated through **Tonal Layering and Glassmorphism** rather than traditional drop shadows.

- **Level 0 (Base):** Deep Matte Black (#0A0A0A). The foundation of the workstation.
- **Level 1 (Panels):** Charcoal Gray (#1A1A1A) with 80% opacity and a 20px backdrop blur. This is the standard for the Mixer, Browser, and Inspector.
- **Level 2 (Pop-overs/Modals):** Lighter gray (#2A2A2A) with a 1px inner stroke of white at 10% opacity to simulate a glass edge.
- **Active Glow:** Interactive elements use a 0px blur, 4px spread "outer glow" using the Primary Neon Blue to indicate focus, simulating light emitting from a hardware button.

## Shapes

The design system uses a **Soft (0.25rem)** roundedness profile to maintain a professional, architectural feel. 

Hard 90-degree corners are avoided to make the software feel approachable, but large radii (pills) are restricted only to "Play" buttons or status badges. This ensures the UI feels like a precision tool rather than a consumer mobile app. Faders and knobs should utilize circular geometry for the interaction point but sit within "Soft" rectangular tracks.

## Components

- **Buttons:** Primary buttons use a subtle gradient from Secondary Purple to Primary Blue with a glass-edge highlight. Secondary buttons are "Ghost" style with a 1px Charcoal stroke.
- **Knobs (Rotary):** Custom-built vector dials. The "fill" track uses the Primary Blue glow. Use a subtle conical gradient to simulate a brushed-metal texture.
- **Audio Meters:** Segmented bars using the Tertiary Warm Orange. The top 3dB should have a "Clip" state that glows intensely.
- **Track Lanes:** Backgrounds should be slightly transparent to let the purple ambient accents bleed through from the workspace background.
- **Input Fields:** Flat, dark backgrounds with the Primary Blue underline when focused. Use JetBrains Mono for all numeric inputs.
- **Chips/Badges:** Used for FX inserts. Small, 0.25rem radius, with a subtle color-coded left border (Blue for Dynamics, Purple for Time-based effects).