# 002: Tablet and iPad layout: width thresholds, sidebar, list and detail panes

- **Date**: 2026-10-04
- **Status**: accepted
- **Tags**: frontend, mobile, tablet, layout
- **Author**: Marius Trica <tricabit@gmail.com>

## Context

Prome 1.0 ships phone-only (supportsTablet false). Tablets matter for the product, and two platform facts force real support rather than a stretched phone app: Android 16 ignores the portrait lock on screens 600dp and wider for apps targeting SDK 36 (Prome does), and iPadOS 26 runs every iPad app in a freely resizable window. Apple also forbids removing iPad support once a version ships with it, so it lands in 1.1, not 1.0.

## Decision

Layout follows the WINDOW width, never the device, through two pure functions in src/lib/layout.ts (tested with node --test): layoutLargo at 768pt moves the tabs to a 240pt sidebar (tabBarPosition left, material variant, no new dependency); duePannelli at 1000pt splits list (360pt) and detail side by side via ElencoEDettaglio. Below 768 the phone layout is unchanged. Screen and Intestazione cap content at a 720pt centered column (design token larghezza.colonna), a no-op on phones. The three detail screens (study room, post, group) moved to components/dettagli taking an id; their routes are thin wrappers. Cards open details through useApriDettaglio (pane when split, router.push otherwise) and details leave through useLasciaDettaglio (close the pane, or back/replace). iPad gets all four orientations through UISupportedInterfaceOrientations~ipad; iPhone stays portrait.

## Consequences

Phones render exactly as before (all widths under 768pt). Every new list-and-detail screen must go through ElencoEDettaglio and the two hooks, or it will push a new screen on tablets. Detail components must not call router.back/replace directly when what they show goes away; they use useLasciaDettaglio. iPad screenshots (13-inch) become mandatory on App Store Connect from 1.1. Android tablets on version 15 or older stay portrait.

## What would end this

Revisit if the sidebar or list widths change (the 1000pt threshold is their sum plus a 400pt minimum detail), if a screen needs three panes, or if Android 15-and-older tablets become a meaningful share of users and landscape on them is requested.

## Alternatives Considered

1. Per-device detection (isTablet): wrong for iPad windows at half width and for foldables; rejected in favor of window width
1. Two-pane at the 768pt threshold: leaves an 11-inch iPad in portrait with a detail pane about 230pt wide, narrower than a phone
1. Nested expo-router layouts per tab for master/detail: more routing surface for the same result, and deep links to /aula/[id] would need to know the layout
1. expo-screen-orientation to unlock landscape on Android 15 and older tablets: new native dependency; deferred, Android 16+ already allows it
