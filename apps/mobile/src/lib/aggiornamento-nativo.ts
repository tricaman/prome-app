import Constants from 'expo-constants';
import { getLocales } from 'expo-localization';
import { Linking, Platform } from 'react-native';
import SpInAppUpdates, {
  IAUInstallStatus,
  IAUUpdateKind,
  type AndroidNeedsUpdateResponse,
  type InstallationResult,
  type StatusUpdateEvent,
} from 'sp-react-native-in-app-updates';
import { aggiornamentoInstallabile, leggiSchedaAppStore, negoziDaInterrogare } from './aggiornamento';

/**
 * The store side of the "update available" notice.
 *
 * - Android asks Play Core (`sp-react-native-in-app-updates`), which answers
 *   for THIS device and can download the update without leaving Prome: the
 *   FLEXIBLE flow, with our own progress bar and a "restart" at the end.
 * - iOS asks iTunes Lookup, since Apple has no update API, and the button
 *   opens the App Store.
 *
 * The decisions live in `aggiornamento.ts` (pure, unit tested). Nothing here
 * ever reaches the user as an error: a store that cannot be asked leaves the
 * last answer in place (see `controllaAggiornamento`), and with no answer at
 * all nothing shows.
 */

/** What the check found. `inApp`: Play can download it without leaving Prome. */
export type Aggiornamento =
  | { disponibile: false }
  | { disponibile: true; inApp: boolean; indirizzo: string | null };

/** Where Play's FLEXIBLE download is. Only Android ever leaves `fermo`. */
export type FaseScaricamento = 'fermo' | 'inCorso' | 'pronto' | 'installazione' | 'fallito';

export interface Scaricamento {
  fase: FaseScaricamento;
  /** From 0 to 1, meaningful while `inCorso`. */
  avanzamento: number;
}

export const NESSUN_AGGIORNAMENTO: Aggiornamento = { disponibile: false };

/**
 * DEV ONLY: `EXPO_PUBLIC_AGGIORNAMENTO_PROVA=1` in `.env` shows the notice and
 * fakes the Android download, since no store serves an update to a local
 * build. Always off in a release build, where `__DEV__` is false.
 */
const PROVA = __DEV__ && process.env.EXPO_PUBLIC_AGGIORNAMENTO_PROVA === '1';

let scaricamento: Scaricamento = { fase: 'fermo', avanzamento: 0 };
const osservatori = new Set<() => void>();

/**
 * The download lives here and not in a screen: Play keeps reporting while the
 * sheet is closed, and reopening it must find the bar where it was.
 * `osservaScaricamento` and `leggiScaricamento` are the pair
 * `useSyncExternalStore` wants.
 */
export function osservaScaricamento(avvisa: () => void): () => void {
  osservatori.add(avvisa);

  return () => {
    osservatori.delete(avvisa);
  };
}

export function leggiScaricamento(): Scaricamento {
  return scaricamento;
}

/** Back to the start: a failed download is retried from scratch. */
export function azzeraScaricamento(): void {
  imposta('fermo');
}

function imposta(fase: FaseScaricamento, avanzamento = 0): void {
  scaricamento = { fase, avanzamento };
  osservatori.forEach((avvisa) => avvisa());
}

let play: SpInAppUpdates | null = null;

/** Created on first use, which only Android code paths reach. */
function istanzaPlay(): SpInAppUpdates {
  play ??= new SpInAppUpdates(false);

  return play;
}

/**
 * Whether the store has a version this device should update to.
 *
 * It throws when the store cannot be asked (offline, no Play on the device, a
 * build not installed from Play), and the query keeps its last answer. Reading
 * a failure as "nothing new" would hide a known update until the next check.
 */
export async function controllaAggiornamento(): Promise<Aggiornamento> {
  if (PROVA) {
    return { disponibile: true, inApp: Platform.OS === 'android', indirizzo: schedaStore() };
  }

  if (Platform.OS === 'android') return controllaPlay();
  if (Platform.OS === 'ios') return controllaAppStore();

  return NESSUN_AGGIORNAMENTO;
}

/**
 * Play answers for this device only: nothing for a sideloaded build, nothing
 * while a staged rollout has not reached it, nothing for a version that does
 * not run here. So Android asks Play and no one else, and the notice never
 * points at a listing with no update button.
 *
 * `curVersion` is the installed versionCode because the library weighs it
 * against Play's versionCode. The version name would put "3" against "1.8.2",
 * right only while every versionCode is larger than the major version.
 */
async function controllaPlay(): Promise<Aggiornamento> {
  const esito = (await istanzaPlay().checkNeedsUpdate({
    curVersion: String(Constants.expoConfig?.android?.versionCode ?? 0),
  })) as AndroidNeedsUpdateResponse;

  if (!esito.shouldUpdate) return NESSUN_AGGIORNAMENTO;

  return {
    disponibile: true,
    // Play can refuse the in-app flow for a release: the button then opens
    // the listing instead of starting a download that will not come.
    inApp: esito.other?.isFlexibleUpdateAllowed !== false,
    indirizzo: schedaStore(),
  };
}

/**
 * iTunes Lookup says what is on sale; `aggiornamentoInstallabile` decides
 * whether this device can have it. By App Store id, not bundle id, so a `.dev`
 * build, whose bundle id is on no store, still finds the real listing.
 */
async function controllaAppStore(): Promise<Aggiornamento> {
  const id = idAppStore();
  const versioneInstallata = Constants.expoConfig?.version;

  if (!id || !versioneInstallata) return NESSUN_AGGIORNAMENTO;

  for (const negozio of negoziDaInterrogare(getLocales()[0]?.regionCode)) {
    const risposta = await fetch(`https://itunes.apple.com/lookup?id=${id}&country=${negozio}`);

    if (!risposta.ok) throw new Error(`iTunes Lookup ${risposta.status}`);

    const scheda = leggiSchedaAppStore(await risposta.json());

    // Not on sale in this storefront: the next one may have it.
    if (!scheda) continue;

    const installabile = aggiornamentoInstallabile({
      versioneStore: scheda.versione,
      versioneInstallata,
      versioneMinimaSistema: scheda.versioneMinimaSistema,
      versioneSistema: String(Platform.Version),
    });

    return installabile
      ? { disponibile: true, inApp: false, indirizzo: scheda.indirizzo ?? schedaStore() }
      : NESSUN_AGGIORNAMENTO;
  }

  return NESSUN_AGGIORNAMENTO;
}

/**
 * Runs the update: Play's FLEXIBLE flow when it can, the store listing
 * otherwise, which on iOS is always.
 */
export async function avviaAggiornamento(aggiornamento: Aggiornamento): Promise<void> {
  if (!aggiornamento.disponibile) return;

  if (PROVA && aggiornamento.inApp) {
    simulaScaricamento();

    return;
  }

  if (aggiornamento.inApp && (await avviaPlay())) return;

  if (aggiornamento.indirizzo) {
    await Linking.openURL(aggiornamento.indirizzo).catch(() => undefined);
  }
}

/** "Restart now": installs the downloaded update, and Play restarts Prome. */
export function completaAggiornamento(): void {
  if (PROVA) {
    azzeraScaricamento();

    return;
  }

  imposta('installazione');

  try {
    istanzaPlay().installUpdate();
  } catch {
    imposta('fallito');
  }
}

/** Starts Play's FLEXIBLE flow. False when it would not start. */
async function avviaPlay(): Promise<boolean> {
  try {
    imposta('inCorso', 0);
    istanzaPlay().addStatusUpdateListener(suStato);
    istanzaPlay().addIntentSelectionListener(suScelta);
    await istanzaPlay().startUpdate({ updateType: IAUUpdateKind.FLEXIBLE });

    return true;
  } catch {
    staccaAscoltatori();
    imposta('fermo');

    return false;
  }
}

/**
 * The answer to Play's consent dialog.
 *
 * `startUpdate` resolves when the dialog is SHOWN, not when the user answers,
 * and a "no thanks" arrives only here, as a string ("6"): without it the sheet
 * would sit at 0% forever. It goes back to the start, not to "failed":
 * declining is not an error. A yes only means the download began, and
 * `suStato` takes it from there.
 */
function suScelta(esito: InstallationResult): void {
  if (Number(esito) !== IAUInstallStatus.CANCELED) return;

  staccaAscoltatori();
  imposta('fermo');
}

function suStato(evento: StatusUpdateEvent): void {
  switch (evento.status) {
    case IAUInstallStatus.DOWNLOADING: {
      const totale = Number(evento.totalBytesToDownload) || 0;
      const scaricati = Number(evento.bytesDownloaded) || 0;

      imposta('inCorso', totale > 0 ? scaricati / totale : 0);
      break;
    }
    case IAUInstallStatus.DOWNLOADED:
      staccaAscoltatori();
      imposta('pronto', 1);
      break;
    case IAUInstallStatus.INSTALLING:
      imposta('installazione');
      break;
    case IAUInstallStatus.FAILED:
      staccaAscoltatori();
      imposta('fallito');
      break;
    case IAUInstallStatus.CANCELED:
      staccaAscoltatori();
      imposta('fermo');
      break;
  }
}

/** Idempotent: the library drops a listener it does not hold. */
function staccaAscoltatori(): void {
  try {
    istanzaPlay().removeStatusUpdateListener(suStato);
    istanzaPlay().removeIntentSelectionListener(suScelta);
  } catch {
    // Fail-open.
  }
}

/** The dev preview of the bar: 0 to 1 in four seconds, then "ready". */
function simulaScaricamento(): void {
  let avanzamento = 0;

  imposta('inCorso', 0);

  const timer = setInterval(() => {
    avanzamento += 0.1;

    if (avanzamento >= 1) {
      clearInterval(timer);
      imposta('pronto', 1);
    } else {
      imposta('inCorso', avanzamento);
    }
  }, 400);
}

/** The listing, for when the update cannot happen inside Prome. */
function schedaStore(): string | null {
  if (Platform.OS === 'ios') {
    const id = idAppStore();

    return id ? `https://apps.apple.com/app/id${id}` : null;
  }

  const pacchetto = Constants.expoConfig?.extra?.pacchettoAndroid;

  return Platform.OS === 'android' && typeof pacchetto === 'string' && pacchetto !== ''
    ? `https://play.google.com/store/apps/details?id=${pacchetto}`
    : null;
}

function idAppStore(): string | null {
  const id = Constants.expoConfig?.extra?.idAppStore;

  return typeof id === 'string' && id !== '' ? id : null;
}
