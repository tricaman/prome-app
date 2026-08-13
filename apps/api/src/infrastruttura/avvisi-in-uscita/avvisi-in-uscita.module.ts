import { Module } from '@nestjs/common';
import { CANALE_EMAIL } from './canale-email';
import { CanaleEmailSviluppo } from './canale-email-sviluppo';

/**
 * AvvisiInUscita — i canali con cui il prodotto parla verso l'esterno.
 *
 * Per ora c'è solo l'email, e il solo adattatore è quello di sviluppo. Quando
 * lo spike sceglierà il fornitore, qui si aggiunge un secondo adattatore e la
 * `useClass` diventa una scelta su `env.CANALE_EMAIL`: nessun altro file
 * cambia, perché nessun altro file conosce il fornitore.
 */
@Module({
  providers: [CanaleEmailSviluppo, { provide: CANALE_EMAIL, useExisting: CanaleEmailSviluppo }],
  exports: [CANALE_EMAIL, CanaleEmailSviluppo],
})
export class AvvisiInUscitaModule {}
