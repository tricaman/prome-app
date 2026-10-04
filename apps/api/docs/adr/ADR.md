# Architecture Decision Records

Every decision this project has taken, newest first. The numbered files in
this directory are the source of truth; this index is generated from them by
`webidoo_process_adr`, so editing it by hand is work the next call throws away.

## Index

| # | Title | Date | Status | Tags |
|---|-------|------|--------|------|
| [001](001-academic-catalog-imported-from-mur-open-data-with-automatic-retirement-of-remove.md) | Academic catalog imported from MUR open data, with automatic retirement of removed courses | 2026-10-04 | accepted | backend, data, catalog |

## What each decision says

The opening sentence of each decision and of what it cost, lifted from the
file. Where a line stops short the rest is in the ADR.

| ADR | Decision | Consequence |
|-----|----------|-------------|
| [001](001-academic-catalog-imported-from-mur-open-data-with-automatic-retirement-of-remove.md) | A script (scripts/importa-catalogo-mur.ts, `catalogo:importa`) turns the MUR files "01_atenei.csv" and "03_offertaformativa" into dati/catalogo-mur.json, versioned in the repo and read by the existing seed. | The catalog covers every Italian university with an offering (92 universities, 159 classes, 5,949 courses for 2025) and is refreshed once a year by rerunning the script on the new MUR files. |

## By theme

Tags carried by 3 or more decisions. A decision appears under every
theme it carries, and the early ADRs that predate the tag field are listed last.

## Operating rules

- Record a structural decision with `webidoo_process_adr`, when it is taken.
- Never rewrite an accepted decision. Supersede it with a new one that says why.
- Never edit this file. Edit the ADR and let the next call regenerate it.
