# 003: Modal routes take their safe areas from the native SafeAreaView

- **Date**: 2026-10-24
- **Status**: accepted
- **Tags**: frontend, mobile, layout, safe-area
- **Author**: Marius Trica <tricabit@gmail.com>

## Context

componi, crea-aula and crea-gruppo are routes with presentation 'modal'. System headers are off app-wide, so each draws its own bar: close, title, primary action (Pubblica, Apri, Salva). The bar took no safe area, and the content below it took it through Screen, that is useSafeAreaInsets(), which returns the root SafeAreaProvider's insets: the window's. On Android a modal is a full-screen route drawn edge to edge, so the bar sat under the status bar icons, primary action included, and the inset became an empty strip under the bar. On iOS the same route is a page sheet that starts below the status bar, so the window's inset is wrong there too: an empty strip as tall as the status bar. React Navigation's own header makes the same split by hand (no top inset for iOS modals, in the native-stack vendored by expo-router 57). Android 16 removes the edge-to-edge opt-out for apps targeting SDK 36, which Prome does, so the system cannot be asked to keep content out of the status bar.

## Decision

Each modal route wraps bar and content in SafeAreaView from react-native-safe-area-context 5.7 (already a dependency; the SDK 57 docs: "If you can, use SafeAreaView"), with edges top and bottom and the sfondo background, and passes conAreaSicura={false} to Screen. On iOS the presented sheet lives outside the root provider's view tree, so the native view falls back to UIKit's safe area for itself: top 0. On Android it reads the root provider's insets, the status bar height, and cancels the draw in which they change. The bar and the status bar strip form a fixed, opaque band; the content scrolls in the ScrollView below it and is clipped at the bar's edge. Card routes keep Intestazione and useSafeAreaInsets(), which is right on a route that covers the window. The rule is in AGENTS.md (Tema e design system).

## Consequences

Positive: the primary action sits below the status bar on Android; the empty strip under the bar is gone on both platforms; no new dependency and no native rebuild. Negative: it is a convention, not a component, so a modal route that copies a card route's frame (Intestazione + Screen) brings the bug back; on iOS, with no provider above it, the view rereads its insets when it is attached and whenever React updates it, not on every UIKit change; in these three screens the content no longer scrolls behind the home indicator or the navigation bar, the bottom is a fixed band too.

## What would end this

System headers come back on modal routes, which take the insets themselves; or the three hand-drawn bars merge into one modal frame that owns the SafeAreaView; or an iOS sheet shows stale insets (an iPad window resized while it is open), and the fourth alternative comes back for iOS.

## Alternatives Considered

1. Native stack header on the three routes (headerShown, headerLeft, headerRight): takes the insets on both platforms, but reverses the app-wide choice of custom headers in the root _layout.tsx and restyles these bars as system bars
1. One SafeAreaView (edges top) around the root Stack, a status bar band for the whole app: one place, but every screen that already adds the top inset (Intestazione, Screen, toasts, chat) would get it twice, and nothing could draw under the status bar anymore
1. useSafeAreaInsets() with Platform.OS === 'ios' ? 0 : insets.top, as React Navigation's header does: no native view, but it hard-codes today's presentation per platform, and a route moved to fullScreenModal on iOS would lose its inset without a sign
1. A SafeAreaProvider at the root of each modal, as the safe-area-context docs suggest for react-native-screens: makes useSafeAreaInsets() right inside the modal, but on Android a provider computes its insets from its on-screen rect (getGlobalVisibleRect), which an enter transition can move, while the root provider never moves
