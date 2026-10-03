# 001: In-app review prompt fires after a published post; the settings row opens the store listing

- **Date**: 2026-10-02
- **Status**: accepted
- **Tags**: mobile, growth, store-review
- **Author**: Marius Trica <tricabit@gmail.com>

## Context

Prome mobile had no way to ask for an App Store / Play rating. norbo-mobile and dit-mobile just shipped one (expo-store-review, weekly throttle, never on day one, fired on a payoff moment rather than on launch, because iOS spends one of its 3 yearly prompts whether or not the user took it in). Apple ("Avoid requesting a review as the result of a user action") and Google ("you should not have a call-to-action option (such as a button) to trigger the API") both say a button must link to the store listing, because the capped sheet may silently not show. Prome is not on the App Store yet, so there is no App Store id; it has no MMKV, and stores small device-only preferences in expo-secure-store (prome.tema). Creating a room or accepting an invite lands in the voice room, where a system sheet would cover a live call.

## Decision

Add expo-store-review 57.0.3 (the SDK 57 version, no manifest permissions). The automatic prompt fires 3s (RITARDO_MOMENTO_MS) after dopoPostPubblicato(), called from the composer's publish success handler, so it lands on the feed. It keeps one armed ask at a time, drops it when the app goes to background, is native-sheet-only, is throttled weekly in expo-secure-store (prome.recensione.ultimaRichiesta), lets the first post only start the clock, and writes the timestamp only after requestReview() resolves. The "Rate Prome" settings row never calls requestReview(): it opens the listing (?action=write-review on iOS) built from extra.idAppStore / extra.pacchettoAndroid in app.config.ts, restarts the clock, and is drawn only when a listing exists, so on iOS it stays hidden until idAppStore is set. Pure decisions (richiestaDovuta, indirizzoRecensione) live in src/lib/recensione.ts, tested with node --test (new pnpm test script, @types/node 22.20.1, allowImportingTsExtensions). A star icon (stella) joins the design tokens.

## Consequences

Positive: same behavior as norbo and dit, so one mental model across the three apps; the sheet appears right after Prome visibly did its job, never over launch, never on day one, never over a voice call; the settings row always does something visible; no backend change; decision logic is pure and unit tested. Negative: users who never publish a post (study-room-only users) are reached only through the settings row; iOS users get no settings row until the App Store id is filled in; the iOS keychain keeps the timestamp across reinstalls; a new native module needs a rebuild, and dev clients built before it crash at import.

## What would end this

Store data shows too few prompts (most active users study in rooms and never post), at which point a calm moment after leaving a study room should be added; or Apple / Google start allowing button-triggered review sheets; or the app gets an App Store id, at which point only extra.idAppStore changes, not this decision.

## Alternatives Considered

1. Prompt a few seconds after launch (aplomb parity): simplest, but asks before the user has done anything
1. Trigger after creating a room or accepting an invite: both land in the voice room, where the sheet covers a live call
1. Trigger after sending a comment or a chat message: frequent, keyboard up, mid-conversation
1. Settings row tries the native sheet first: looks broken once the quota is spent, against both store guidelines
1. Show the iOS row as a Presto placeholder until the App Store id exists: a row for a release-time detail, not a missing feature
1. Add react-native-mmkv for the timestamp like norbo: a second native storage module for one number, when expo-secure-store is already there
1. A custom 'enjoying Prome?' pre-prompt before the OS sheet: review gating, discouraged by Apple and against Google Play policy
