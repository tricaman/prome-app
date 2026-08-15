import { Module } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { env } from '../../config/env';
import { CANALE_EMAIL, type CanaleEmail } from './canale-email';
import { CanaleEmailSviluppo } from './canale-email-sviluppo';
import { CanaleEmailSmtp } from './canale-email-smtp';
import { CANALE_NOTIFICHE } from './canale-notifiche';
import { CanaleNotificheSenzaFornitore } from './canale-notifiche-senza-fornitore';

/**
 * AvvisiInUscita — i canali con cui il prodotto parla verso l'esterno.
 *
 * Due trasporti per una responsabilità sola — recapitare fuori dall'app un
 * avviso prodotto da un modulo — e per ciascuno una porta.
 *
 * **Email**: due adattatori, una scelta sola in `env.CANALE_EMAIL`, e nessun
 * altro file sa quale dei due sia in uso. `sviluppo` scrive i codici nei log e
 * non manda niente; `smtp` parla con un fornitore vero, quale che sia.
 *
 * **Notifiche**: un adattatore solo, e non manda niente — è la posizione
 * dichiarata, non un lavoro a metà. L'architettura esclude ogni fornitore di
 * notifica push privo di regione UE selezionabile, e finché quella verifica
 * non è fatta il fornitore resta non assegnato. Ciò che decide se, quando e a
 * chi arriva un avviso sta comunque dall'altra parte della porta, ed è già
 * scritto e provato.
 */
@Module({
  providers: [
    CanaleEmailSviluppo,
    CanaleEmailSmtp,
    CanaleNotificheSenzaFornitore,
    { provide: CANALE_NOTIFICHE, useExisting: CanaleNotificheSenzaFornitore },
    {
      provide: CANALE_EMAIL,
      inject: [CanaleEmailSviluppo, I18nService],
      useFactory: (sviluppo: CanaleEmailSviluppo, i18n: I18nService): CanaleEmail =>
        env.CANALE_EMAIL === 'smtp' ? new CanaleEmailSmtp(i18n) : sviluppo,
    },
  ],
  exports: [CANALE_EMAIL, CanaleEmailSviluppo, CANALE_NOTIFICHE, CanaleNotificheSenzaFornitore],
})
export class AvvisiInUscitaModule {}
