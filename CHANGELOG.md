# v2.6 (2026-08-13)

- Fix: avoid TypeError in redrawHighlights handler
- Fix: ignore textBg if text is outside the canvas
- Fix: update text when gradients/patterns are present
- Improvement: simplify image blending in drawImage handler
- Improvement: make free, find highlights more visible in dark
- Refactor: rewrite and refactor annotation handling
- Update: annotation, color picker handling for PDF.js 5.2+
- Update: legacy comparison for PDF.js 5.x


# v2.5 (2025-04-26)

- Fix: make SVG icons visible in Chromium browsers
- Fix: fast GPU rendering with improved canvas caching
- Fix: blending image annotations during theme change
- Fix: stop blending intermediate offscreen canvases
- Update: adapt for PDF.js v4.7+, drop v2.x support
- Feature: replace Invert mode with custom CSS Filter
- Improvement: new schema file for extension options
- New theme: Chrome Reading mode color scheme


# v2.4 (2024-07-07)

- Update: target PDF.js v4.1: support Stamps and Highlights
- Feature: enable non-viewer integration and general usage
- Refactor: separate the theme engine, components into modules
- Refactor: make awaiting PDF.js eventBus reusable
- Improvement: wrap setters to proactively calculate styles
- Improvement: drop storing canvas, minimize checking background
- Fix: map colors to gradient if no accents were provided


# v2.3 (2023-02-08)

- Update: target PDF.js 3.2, but retain legacy compatibility
- Update: new reader icon to match the revamped PDF.js UI
- Improvement: optimize saving canvas for faster rendering
- Feature: theme support for added text annotations
- Fix: avoid redraw when simply disabling invert mode
- Improvement: refactor method wrapping


# v2.2 (2022-10-30)

- Update: target PDF.js version 2.16
- Improvement: handle transparent canvas styles
- Improvement: color calc based on BG of the text centre
- Feature: support for PDF.js annotation editor
- Fix: separate canvas data for different pages
- Fix: apply invert filter to individual pages


# v2.1 (2022-05-21)

- Update: target PDF.js version 2.13
- Add themes: Nord and Firefox reader view
- Revamp UI: neat, minimal & simplified toolbar
- Feature: separate preferences based on OS theme
- Feature: configurable options to control behaviour
- Improvement: accessibility and color schemes
- Improvement: better performance when reader is off
- Fix: printing, thumbnails & some minor errors


# v2.0 (2021-11-05)

Major update, almost a complete rewrite. See c941877, 4b42993.

### Changes

- Name, logo, core functionality: convert to Reader mode
- Stop tweaking the text layer; act directly on the canvas
- Properly apply a color scheme: preserve monotones and accents
- Accurate color transformations based on color science
- Process/leave images instead of show/hiding them
- Move the UI to its own separate (accessible) toolbar
- Remove the PDF.js wrapper; this is now addon-only


# v1.2 (2021-01-25)

- Feature: support multiple color schemes
- Feature: gestures for toggling toolbar and scrolling
- Improvement: change font resize buttons to html slider
- Fix: random text inflation in iOS Safari
- Fix: URL encode the path to the PDF file
- Refactor: linking CSS


# v1.1 (2020-12-19)

- Fix: make font resize persistent across page loads
- Feature: make Terminal Mode and Lights Off mutually exclusive
- Feature: plugin buttons are now highlighted when toggled On
- Feature: toolbar buttons now disappear only in small views
- Add: all plugin controls can now be accessed using Tab key
- Improvement: minor code refactor


# v1.0 (2020-12-17)

### Release version 1.0
