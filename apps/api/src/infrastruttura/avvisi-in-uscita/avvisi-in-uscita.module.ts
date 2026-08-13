import { Module } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { env } from '../../config/env';
import { CANALE_EMAIL, type CanaleEmail } from './canale-email';
import { CanaleEmailSviluppo } from './canale-email-sviluppo';
import { CanaleEmailSmtp } from './canale-email-smtp';

/**
 * AvvisiInUscita — i canali con cui il prodotto parla verso l'esterno.
 *
 * Due adattatori, una scelta sola in `env.CANALE_EMAIL`: nessun altro file
 * sa quale dei due sia in uso. `sviluppo` scrive i codici nei log e non manda
 * niente; `smtp` parla con un fornitore vero, quale che sia.
 */
@Module({
  providers: [
    CanaleEmailSviluppo,
    CanaleEmailSmtp,
    {
      provide: CANALE_EMAIL,
      inject: [CanaleEmailSviluppo, I18nService],
      useFactory: (sviluppo: CanaleEmailSviluppo, i18n: I18nService): CanaleEmail =>
        env.CANALE_EMAIL === 'smtp' ? new CanaleEmailSmtp(i18n) : sviluppo,
    },
  ],
  exports: [CANALE_EMAIL, CanaleEmailSviluppo],
})
export class AvvisiInUscitaModule {}
