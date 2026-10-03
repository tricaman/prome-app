import Constants from 'expo-constants';
import * as ArchivioSicuro from 'expo-secure-store';
import * as StoreReview from 'expo-store-review';
import { AppState, Linking, Platform } from 'react-native';
import { indirizzoRecensione, richiestaDovuta } from './recensione';

/**
 * Thin wrapper around `expo-store-review`, which fronts
 * SKStoreReviewController on iOS and Play In-App Review on Android: one call
 * covers both, so the automatic prompt never branches on platform.
 *
 * The decisions live in `recensione.ts` (pure, unit tested); this file only
 * owns the native calls, the moment and the throttle timestamp.
 *
 * Everything is FAIL-OPEN: a store that will not talk to us is never worth an
 * error in the user's face.
 */

/**
 * How long after a published post the automatic prompt fires: long enough for
 * the composer to close and the feed to land first.
 */
export const RITARDO_MOMENTO_MS = 3000;

/**
 * Same store and naming as the theme choice (`prome.tema`). On iOS the
 * keychain outlives a reinstall, so the weekly clock does too: a reinstall is
 * not a reason to ask again sooner.
 */
const CHIAVE_ULTIMA_RICHIESTA = 'prome.recensione.ultimaRichiesta';

/** Cancels the armed ask, or null when none is armed: at most one at a time. */
let annullaRichiestaArmata: (() => void) | null = null;

/** An automatic request is running, from the throttle read to the native call settling. */
let richiestaInCorso = false;

/**
 * Epoch millis of the last ask, or null when there is none, including a value
 * we cannot make sense of or cannot read, which then reads as never asked.
 */
async function leggiUltimaRichiesta(): Promise<number | null> {
  const salvata = await ArchivioSicuro.getItemAsync(CHIAVE_ULTIMA_RICHIESTA).catch(() => null);

  if (!salvata) {
    return null;
  }

  const istante = Number(salvata);

  return Number.isFinite(istante) ? istante : null;
}

async function scriviUltimaRichiesta(istante: number): Promise<void> {
  await ArchivioSicuro.setItemAsync(CHIAVE_ULTIMA_RICHIESTA, String(istante)).catch(
    () => undefined,
  );
}

function testoOppureNull(valore: unknown): string | null {
  return typeof valore === 'string' ? valore : null;
}

/**
 * The store page the settings row opens, or null when there is none: on iOS
 * until `extra.idAppStore` is set in `app.config.ts`. The row is drawn only
 * when this is not null, so it never sits there doing nothing.
 */
export function indirizzoRecensioneApp(): string | null {
  const extra = Constants.expoConfig?.extra ?? {};

  return indirizzoRecensione({
    piattaforma: Platform.OS,
    idAppStore: testoOppureNull(extra.idAppStore),
    pacchettoAndroid: testoOppureNull(extra.pacchettoAndroid),
  });
}

/**
 * The "Rate Prome" settings row: opens the store listing, never the native
 * sheet (see `indirizzoRecensione`).
 */
export async function apriSchedaRecensione(): Promise<void> {
  const indirizzo = indirizzoRecensioneApp();

  if (!indirizzo) {
    return;
  }

  try {
    await Linking.openURL(indirizzo);

    // The user has just been to the store, so restart the weekly clock and
    // keep the automatic prompt from turning up a few days later.
    await scriviUltimaRichiesta(Date.now());
  } catch {
    // Fail-open: no listing, no error message.
  }
}

/**
 * Called from the success handler of the composer: the post is out and the
 * feed is about to show it, which is the moment Prome has just done its job.
 *
 * Going to the background drops the armed ask instead of letting it run:
 * Android pauses JS timers there and fires the overdue one on resume, once
 * AppState already reads "active", so the sheet would greet the user hours
 * after the post. `inactive` keeps it: it is transient on iOS (Notification
 * Center, Control Center, an incoming call).
 */
export function dopoPostPubblicato(): void {
  if (annullaRichiestaArmata !== null || richiestaInCorso) {
    return;
  }

  const timer = setTimeout(() => {
    annulla();
    void forseChiediRecensione();
  }, RITARDO_MOMENTO_MS);
  const ascoltoStato = AppState.addEventListener('change', (stato) => {
    if (stato === 'background') {
      annulla();
    }
  });
  const annulla = () => {
    clearTimeout(timer);
    ascoltoStato.remove();
    annullaRichiestaArmata = null;
  };

  annullaRichiestaArmata = annulla;
}

/**
 * The automatic prompt, fired by `dopoPostPubblicato` shortly after a post.
 *
 * Native sheet only: unlike the settings row it never falls back to the store
 * listing, since throwing the user out to the store unasked is worse than
 * skipping the run. `isAvailableAsync()` is false on TestFlight builds.
 *
 * One request at a time: Play's review flow can take seconds, and a second
 * post landing meanwhile would otherwise launch a second flow.
 */
async function forseChiediRecensione(): Promise<void> {
  if (richiestaInCorso) {
    return;
  }

  richiestaInCorso = true;

  try {
    const adesso = Date.now();
    const ultimaRichiesta = await leggiUltimaRichiesta();

    // First post: it only starts the clock.
    if (ultimaRichiesta === null) {
      await scriviUltimaRichiesta(adesso);

      return;
    }

    if (!richiestaDovuta({ ultimaRichiesta, adesso })) {
      return;
    }

    // Backstop for the listener in `dopoPostPubblicato`: never ask from the
    // background, where no sheet can show; keep the slot for the next post.
    if (AppState.currentState !== 'active') {
      return;
    }

    if (!(await StoreReview.isAvailableAsync())) {
      return;
    }

    await StoreReview.requestReview();

    // iOS never says whether the sheet was actually drawn (it is capped at 3
    // per user per year), so the request counts as spent regardless. A
    // rejection (Android: Play's review flow failed; iOS: no foreground scene)
    // means no sheet was shown: it skips this line and keeps the slot.
    await scriviUltimaRichiesta(adesso);
  } catch {
    // Fail-open.
  } finally {
    richiestaInCorso = false;
  }
}
