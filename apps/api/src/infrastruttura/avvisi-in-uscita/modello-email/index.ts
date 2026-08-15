import type { ContenutoEmail } from './blocchi';
import { componiHtml, type TestiInvolucro } from './involucro';
import { allegatoDelMarchio, type AllegatoInLinea } from './marchio';
import { intestazioneSicura } from './sicurezza';
import { componiTesto } from './testo';

export * from './blocchi';
export { CID_LOGO, logoPng } from './marchio';
export type { AllegatoInLinea } from './marchio';
export type { TestiInvolucro } from './involucro';

/**
 * Il modello delle email di Prome.
 *
 * `componiEmail` è **l'unico modo** di ottenere un messaggio: prende dei
 * blocchi e restituisce le tre parti che un fornitore qualsiasi sa spedire.
 * Non conosce SMTP, non conosce nodemailer, non conosce Brevo né Resend —
 * quando lo spike del piano deciderà quale usare, il nuovo adattatore riuserà
 * questo file senza toccarlo, che è tutto ciò che una porta deve garantire.
 */

/** Un messaggio pronto da consegnare, nella forma che ogni fornitore accetta. */
export interface EmailComposta {
  readonly oggetto: string;
  /** Parte in testo semplice. */
  readonly testo: string;
  /** Parte HTML. */
  readonly html: string;
  /** Il marchio in linea. Sempre presente: fa parte dell'involucro. */
  readonly allegati: readonly AllegatoInLinea[];
}

export function componiEmail(
  contenuto: ContenutoEmail,
  lingua: string,
  testi: TestiInvolucro,
): EmailComposta {
  return {
    oggetto: intestazioneSicura(contenuto.oggetto),
    testo: componiTesto(contenuto, testi),
    html: componiHtml(contenuto, lingua, testi),
    allegati: [allegatoDelMarchio()],
  };
}
