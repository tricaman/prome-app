import { Module } from '@nestjs/common';
import { ARCHIVIO_DI_FILE } from './archivio-file';
import { ArchivioLocale } from './archivio-locale';

/**
 * ArchivioDiFile — dove finiscono i byte.
 *
 * Un adattatore solo, per ora: quello locale. Quando il fornitore reale sarà
 * scelto si aggiunge una classe e la `useClass` diventa una scelta su
 * `env.ARCHIVIO_FILE`; nessun altro file cambia, perché nessun altro file
 * conosce il fornitore.
 *
 * `ArchivioLocale` è esportato anche per sé, e non solo dietro il gettone,
 * perché l'endpoint di caricamento ha bisogno di due operazioni che il dominio
 * non deve vedere: scrivere i byte e rileggerli.
 */
@Module({
  providers: [ArchivioLocale, { provide: ARCHIVIO_DI_FILE, useExisting: ArchivioLocale }],
  exports: [ARCHIVIO_DI_FILE, ArchivioLocale],
})
export class ArchivioFileModule {}
