import type { Messaggi } from '@prome/i18n';
import { percorsi } from '@/content';

type ChiaveNav = keyof Messaggi['sito']['nav'];

export interface VoceNav {
  /** Chiave dentro `sito.nav` del catalogo: l'etichetta è tradotta. */
  chiave: ChiaveNav;
  href: string;
}

/**
 * Navigazione del sito pubblico.
 *
 * Il sito racconta il prodotto: non contiene contenuti degli utenti, quindi
 * qui non c'è nessuna directory di aule studio, post o profili. Chi cerca
 * quelli deve accedere — è il senso stesso di "Pubblico" nel dominio, che
 * significa "aperto a tutti gli studenti iscritti", non "aperto al web".
 */
export const NAV_PRINCIPALE: readonly VoceNav[] = [
  { chiave: 'atenei', href: percorsi.atenei() },
  { chiave: 'argomenti', href: percorsi.argomenti() },
  { chiave: 'guide', href: percorsi.guide() },
  { chiave: 'chiSiamo', href: percorsi.chiSiamo() },
];

type ChiaveFooter = keyof Messaggi['sito']['footer'];

export interface ColonnaFooter {
  titolo: ChiaveFooter;
  voci: readonly { chiave: ChiaveFooter; href: string }[];
}

export const COLONNE_FOOTER: readonly ColonnaFooter[] = [
  {
    titolo: 'prodotto',
    voci: [
      { chiave: 'comeFunziona', href: percorsi.chiSiamo() },
      { chiave: 'aulePubbliche', href: percorsi.chiSiamo() },
      { chiave: 'gruppiPubblici', href: percorsi.chiSiamo() },
      { chiave: 'appIos', href: percorsi.home() },
      { chiave: 'appAndroid', href: percorsi.home() },
    ],
  },
  {
    titolo: 'esplora',
    voci: [
      { chiave: 'tuttiGliAtenei', href: percorsi.atenei() },
      { chiave: 'argomenti', href: percorsi.argomenti() },
      { chiave: 'guide', href: percorsi.guide() },
    ],
  },
  {
    titolo: 'risorse',
    voci: [
      { chiave: 'chiSiamo', href: percorsi.chiSiamo() },
      { chiave: 'privacy', href: percorsi.privacy() },
    ],
  },
];
