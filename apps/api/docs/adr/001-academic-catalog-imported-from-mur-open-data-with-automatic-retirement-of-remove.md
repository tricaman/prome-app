# 001: Academic catalog imported from MUR open data, with automatic retirement of removed courses

- **Date**: 2026-10-04
- **Status**: accepted
- **Tags**: backend, data, catalog
- **Author**: Marius Trica <tricabit@gmail.com>

## Context

The catalog is closed: a student whose course is missing cannot sign up. It held 6 hand-written universities with about 30 courses, mostly with unverified internal codes, while Italy has 92 universities with a degree offering and about 6,000 courses. Writing them by hand does not scale and invites typos. The Ministry (MUR) publishes universities and the yearly degree offering (class, name, campus) as open data under IODL 2.0, but without the universities' internal course codes.

## Decision

A script (scripts/importa-catalogo-mur.ts, `catalogo:importa`) turns the MUR files "01_atenei.csv" and "03_offertaformativa" into dati/catalogo-mur.json, versioned in the repo and read by the existing seed. Scope: every university with an offering in the latest year and all course types (bachelor, master, single cycle). The course code is built as class:name:campus, since MUR has no internal code. The same course at several campuses is one course per campus, named "Name (Campus)". The 6 universities with a public page keep their slug and names through a fixed map keyed by MUR university code. The seed now retires (attivo = false) the courses of a described university that the file no longer lists, never deleting them, and only for universities the file describes.

## Consequences

The catalog covers every Italian university with an offering (92 universities, 159 classes, 5,949 courses for 2025) and is refreshed once a year by rerunning the script on the new MUR files. Codes depend on the MUR name: a course renamed by MUR becomes a new course, and the old one is retired (people enrolled keep it). The previous hand-written courses are retired by the first seed. IODL 2.0 requires attribution to MUR wherever the data is shown. Short names (nomeBreve) come from MUR's operational names and are rough for some universities until reviewed.

## What would end this

Revisit if MUR starts publishing a stable course identifier (switch the code to it), if renamed courses churn too many students onto retired rows, or if an official source with the universities' internal codes becomes available.

## Alternatives Considered

1. Keep curating by hand, one university at a time: does not scale to 6,000 courses and keeps codes unverified
1. Scrape each university's own catalog (Cineca course catalogues) for internal codes: JavaScript-only pages, one format per university, fragile
1. Add every university first and courses later: a university with no courses blocks onboarding, since a course is required
1. Merge campus copies into one course: hides that students at different campuses are in different classrooms
