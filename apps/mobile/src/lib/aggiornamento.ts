/**
 * The decisions behind the "update available" notice.
 *
 * It imports NOTHING, like `recensione.ts`: `pnpm test` loads it with Node's
 * own test runner. The store calls live in `aggiornamento-nativo.ts`.
 */

/**
 * The storefront asked when the device's own has no Prome, or no country to
 * go by: the one Prome ships in first.
 */
export const NEGOZIO_DI_RIPIEGO = 'it';

/**
 * Compares two dotted versions part by part, as numbers: negative when `a` is
 * older, positive when it is newer, 0 when they are the same.
 *
 * A missing part counts as zero ("1.2" is "1.2.0"), and so does a part that is
 * not a number: a version we cannot read must never make the notice throw. A
 * bare build number is a one-part version, which is how Play versionCodes are
 * compared.
 */
export function confrontaVersioni(a: string, b: string): number {
  const partiA = a.split('.').map(numero);
  const partiB = b.split('.').map(numero);

  for (let i = 0; i < Math.max(partiA.length, partiB.length); i += 1) {
    const differenza = (partiA[i] ?? 0) - (partiB[i] ?? 0);

    if (differenza !== 0) {
      return differenza;
    }
  }

  return 0;
}

/**
 * The storefronts to ask on iOS, in order.
 *
 * The lookup without a country hits a global record that Apple caches far
 * longer, and can keep answering with the previous version for hours after a
 * release (dit-mobile found out). The device region is the best guess at the
 * user's storefront; when Prome is not on sale there, the fallback one has it.
 *
 * Only two-letter regions are countries: iOS also reports UN M49 areas such
 * as "419" (Latin America), which no storefront answers to.
 */
export function negoziDaInterrogare(regione: string | null | undefined): string[] {
  const negozio = regione?.toLowerCase() ?? '';

  return /^[a-z]{2}$/.test(negozio) && negozio !== NEGOZIO_DI_RIPIEGO
    ? [negozio, NEGOZIO_DI_RIPIEGO]
    : [NEGOZIO_DI_RIPIEGO];
}

/** What an iTunes Lookup response says about the version on sale. */
export interface SchedaAppStore {
  /** The version on sale, e.g. "1.1.0". */
  versione: string;
  /** The oldest iOS that can install it, or null when Apple does not say. */
  versioneMinimaSistema: string | null;
  /** The App Store page, or null when the response has no usable one. */
  indirizzo: string | null;
}

/**
 * Reads an iTunes Lookup response (`itunes.apple.com/lookup`).
 *
 * @returns null when the storefront does not sell the app (`resultCount: 0`)
 *   or the response is not what Apple documents: the caller then asks the
 *   next storefront, or shows nothing.
 */
export function leggiSchedaAppStore(risposta: unknown): SchedaAppStore | null {
  const risultati = campo(risposta, 'results');
  const primo: unknown = Array.isArray(risultati) ? risultati[0] : undefined;
  const versione = campo(primo, 'version');

  if (typeof versione !== 'string' || versione === '') {
    return null;
  }

  const versioneMinimaSistema = campo(primo, 'minimumOsVersion');
  const indirizzo = campo(primo, 'trackViewUrl');

  return {
    versione,
    versioneMinimaSistema: typeof versioneMinimaSistema === 'string' ? versioneMinimaSistema : null,
    indirizzo: typeof indirizzo === 'string' && indirizzo.startsWith('https://') ? indirizzo : null,
  };
}

/**
 * Whether the App Store has a version THIS device should be told about.
 *
 * Newer is not enough: a release that raises the minimum iOS is listed for
 * everyone, but the App Store will not install it on an older system, so the
 * notice would point at a page with no update button, forever. Play needs no
 * such check: it answers for the device it runs on.
 */
export function aggiornamentoInstallabile({
  versioneStore,
  versioneInstallata,
  versioneMinimaSistema,
  versioneSistema,
}: {
  versioneStore: string;
  versioneInstallata: string;
  versioneMinimaSistema: string | null;
  /** React Native `Platform.Version` on iOS, e.g. "18.2". */
  versioneSistema: string;
}): boolean {
  if (confrontaVersioni(versioneStore, versioneInstallata) <= 0) {
    return false;
  }

  return (
    versioneMinimaSistema === null || confrontaVersioni(versioneSistema, versioneMinimaSistema) >= 0
  );
}

function numero(parte: string): number {
  const valore = Number.parseInt(parte, 10);

  return Number.isNaN(valore) ? 0 : valore;
}

function campo(valore: unknown, nome: string): unknown {
  return typeof valore === 'object' && valore !== null
    ? (valore as Record<string, unknown>)[nome]
    : undefined;
}
