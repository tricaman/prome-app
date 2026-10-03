/**
 * The decisions behind asking for a store review.
 *
 * It imports NOTHING (no react-native, no expo), and that is not pedantry:
 * `pnpm test` loads it with Node's own test runner, which has no idea what a
 * native module is. The native calls live in `recensione-nativa.ts`.
 */

/** How long the automatic prompt stays quiet between two asks. */
export const INTERVALLO_RICHIESTA_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * The page the "Rate Prome" settings row opens.
 *
 * A button NEVER asks for the system sheet. The OS rations it (iOS 3 times a
 * year, Play an undisclosed quota) and past that shows nothing, so the tap
 * would look broken: Apple and Google both say to link to the store listing
 * instead.
 *
 * On iOS `action=write-review` opens the App Store straight on the review
 * composer (Apple's documented deep link). Play has no equivalent, so Android
 * gets the plain listing.
 *
 * @returns the url to open, or `null` when there is nothing to open: on iOS
 *   until the app has an App Store id, and anywhere that is not a phone
 */
export function indirizzoRecensione({
  piattaforma,
  idAppStore,
  pacchettoAndroid,
}: {
  /** React Native `Platform.OS`. */
  piattaforma: string;
  idAppStore: string | null;
  pacchettoAndroid: string | null;
}): string | null {
  if (piattaforma === 'ios') {
    return pieno(idAppStore)
      ? `https://apps.apple.com/app/id${idAppStore}?action=write-review`
      : null;
  }

  if (piattaforma === 'android') {
    return pieno(pacchettoAndroid)
      ? `https://play.google.com/store/apps/details?id=${pacchettoAndroid}`
      : null;
  }

  return null;
}

/**
 * Whether the automatic prompt is due again.
 *
 * `ultimaRichiesta === null` means it has never asked, which is never due: the
 * first moment only starts the clock (see `recensione-nativa.ts`), so the
 * first automatic prompt lands one interval in, never on day one.
 *
 * A timestamp in the future means the device clock moved backwards (or a
 * restored backup carried one over). Without the second branch
 * `adesso - ultimaRichiesta` would stay negative and the prompt would be
 * locked out forever, so it counts as due and the caller rewrites it.
 */
export function richiestaDovuta({
  ultimaRichiesta,
  adesso,
  intervalloMs = INTERVALLO_RICHIESTA_MS,
}: {
  ultimaRichiesta: number | null;
  adesso: number;
  intervalloMs?: number;
}): boolean {
  if (ultimaRichiesta === null) {
    return false;
  }

  if (ultimaRichiesta > adesso) {
    return true;
  }

  return adesso - ultimaRichiesta >= intervalloMs;
}

function pieno(valore: string | null): valore is string {
  return valore !== null && valore.trim() !== '';
}
