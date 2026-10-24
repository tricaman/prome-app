# 004: Store update notice from Play Core and iTunes Lookup, optional only

- **Date**: 2026-10-24
- **Status**: accepted
- **Tags**: mobile, store, release
- **Author**: Marius Trica <tricabit@gmail.com>

## Context

Prome 1.0 was about to ship with no way to tell a user that a newer version is on the store. norbo-mobile and dit-mobile have one, in two shapes. norbo asks its API (GET /app/version: iTunes Lookup plus the Play Developer API with a service account, cached in Redis, and an env minSupported that blocks old versions) and ORs the answer with Play Core. dit asks the stores from the device (sp-react-native-in-app-updates 1.5.0: Play Core on Android, iTunes Lookup with the device country on iOS) and has no blocking gate. Both draw a header icon and a card, with Play's FLEXIBLE download on Android. Prome's distribution rule (AGENTS.md) forbids making a version unusable before 90 days after its successor ships, and the server never tells an old client to update. Prome runs Expo SDK 57 and React Native 0.86, New Architecture only.

## Decision

dit's shape: on the device, optional only, no popup. Android uses sp-react-native-in-app-updates 2.0.0 (a TurboModule with the 1.5.0 API) for Play Core, passing the installed versionCode as curVersion because the library compares it with Play's versionCode, and FLEXIBLE only when Play allows it (the Play listing otherwise). iOS is plain JS: iTunes Lookup by App Store id (extra.idAppStore), the device storefront first and then it, and no notice when the device's iOS is below the release's minimumOsVersion. A check that cannot reach the store throws, so React Query keeps the last answer; a cancelled consent dialog returns to idle. The UI is Prome's own: a round button with a dot in the SchermataTab header and a Foglio for the whole download. Pure decisions in src/lib/aggiornamento.ts (node --test), store calls in src/lib/aggiornamento-nativo.ts, state and sheet in AggiornamentoProvider.

## Consequences

Positive: a notice on both platforms with no backend change, no credentials and no API quota; Android never announces an update this device cannot install yet (staged rollout, sideloaded build), and iOS never one its system is too old for; the update downloads inside the app on Android; the versionCode comparison stays right after version names overtake versionCodes. Negative: a new native module, so a rebuild, and dev clients built before it crash at import; react-native-device-info 10.3.0 (2022, pinned by the library) is linked on both platforms; iOS learns of a release only when Apple's lookup does; a user who never opens a tab never sees the notice; no version can be retired from the server.

## What would end this

A version so broken that it must stop running before the 90 days are up: that needs a forced gate, a server-side minimum (norbo's minSupported) and a change to the distribution rule, in that order. Or a maintained Expo module for Play in-app updates that supports the SDK in use, which would remove device-info.

## Alternatives Considered

1. norbo's endpoint (GET /app/version with iTunes Lookup and the Play Developer API): central cache and a minimum-version knob, but a Play service account, Redis and a deploy, and its OR with Play Core announces updates a device cannot install yet
1. A forced update below a minimum version: breaks the 90-day rule
1. sp-react-native-in-app-updates 1.5.0, as in norbo and dit: proven there, but a bridge module in a New-Architecture-only app, with react-native-siren as a dependency
1. The library's own iOS check: never reads minimumOsVersion, and looks up by bundle id, which finds nothing from a .dev build
1. expo-in-app-updates: an Expo module with an in-app App Store sheet, but 0.12 targets SDK 56 and 0.13 needs SDK 58 and RN 0.88, and it reports no download progress
1. A local Expo module around Play Core: no third-party native code, but native code nobody could build and test before this release
1. A popup at launch: an interruption, for good news
