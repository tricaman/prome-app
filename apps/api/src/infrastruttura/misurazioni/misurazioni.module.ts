import { Global, Module } from '@nestjs/common';
import { MISURAZIONI } from './misurazioni';
import { MisurazioniSenzaFornitore } from './misurazioni-senza-fornitore';

/**
 * MisurazioniDiUtilizzo, disponibile ovunque senza reimportarlo.
 *
 * È globale perché i punti di emissione stanno dove i fatti accadono — nella
 * facciata e nei contesti — e obbligare ognuno a dichiararlo racconterebbe una
 * dipendenza che non è di dominio: contare non è una regola del prodotto.
 */
@Global()
@Module({
  providers: [
    MisurazioniSenzaFornitore,
    { provide: MISURAZIONI, useExisting: MisurazioniSenzaFornitore },
  ],
  exports: [MISURAZIONI, MisurazioniSenzaFornitore],
})
export class MisurazioniModule {}
