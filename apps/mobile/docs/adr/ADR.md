# Architecture Decision Records

Every decision this project has taken, newest first. The numbered files in
this directory are the source of truth; this index is generated from them by
`webidoo_process_adr`, so editing it by hand is work the next call throws away.

## Index

| # | Title | Date | Status | Tags |
|---|-------|------|--------|------|
| [002](002-tablet-and-ipad-layout-width-thresholds-sidebar-list-and-detail-panes.md) | Tablet and iPad layout: width thresholds, sidebar, list and detail panes | 2026-10-04 | accepted | frontend, mobile, tablet, layout |
| [001](001-in-app-review-prompt-fires-after-a-published-post-the-settings-row-opens-the-sto.md) | In-app review prompt fires after a published post; the settings row opens the store listing | 2026-10-02 | accepted | mobile, growth, store-review |

## What each decision says

The opening sentence of each decision and of what it cost, lifted from the
file. Where a line stops short the rest is in the ADR.

| ADR | Decision | Consequence |
|-----|----------|-------------|
| [002](002-tablet-and-ipad-layout-width-thresholds-sidebar-list-and-detail-panes.md) | Layout follows the WINDOW width, never the device, through two pure functions in src/lib/layout.ts (tested with node --test): layoutLargo at 768pt moves the tabs to a 240pt sidebar (tabBarPosition left, material variant,... | Phones render exactly as before (all widths under 768pt). |
| [001](001-in-app-review-prompt-fires-after-a-published-post-the-settings-row-opens-the-sto.md) | Add expo-store-review 57.0.3 (the SDK 57 version, no manifest permissions). | Positive: same behavior as norbo and dit, so one mental model across the three apps; the sheet appears right after Prome visibly did its job, never over launch, never on day one, never over a voice call; the settings row... |

## By theme

Tags carried by 3 or more decisions. A decision appears under every
theme it carries, and the early ADRs that predate the tag field are listed last.

## Operating rules

- Record a structural decision with `webidoo_process_adr`, when it is taken.
- Never rewrite an accepted decision. Supersede it with a new one that says why.
- Never edit this file. Edit the ADR and let the next call regenerate it.
