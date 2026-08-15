import * as SelettoreDocumenti from 'expo-document-picker';
import { tipoAllegatoDa } from '@prome/app-core';
import type { TipoAllegato } from '@prome/contracts';

/**
 * Un file scelto, nella forma che serve al caricamento a tre tempi.
 *
 * `tipo` è già risolto: chi chiama non deve rifare la mappatura dal MIME, e
 * soprattutto non deve dimenticarsene. `null` come esito significa «ha
 * annullato», che non è un errore; un tipo non ammesso è invece un `tipo`
 * assente, e chi chiama decide se dirlo o tacere.
 */
export interface FileScelto {
  uri: string;
  nome: string;
  /** `null` quando il formato non è fra quelli ammessi (PDF, immagini, testo). */
  tipo: TipoAllegato | null;
  mimeType: string;
  dimensione: number;
}

/** I formati ammessi, nella forma che il selettore di documenti si aspetta. */
const FORMATI_AMMESSI = ['application/pdf', 'image/*', 'text/*'];

/** Quando il MIME manca del tutto: lo dichiariamo generico e lascia decidere al server. */
const MIME_DI_RIPIEGO = 'application/octet-stream';

/**
 * Il selettore di documenti del sistema: PDF, immagini e file di testo.
 *
 * Era scritto due volte, identico, nel composer dei post e nei materiali
 * d'aula. Sta qui perché è **una decisione sola** — quali formati si possono
 * allegare e come si normalizza ciò che il sistema restituisce — e due copie
 * divergono: la seconda a essere aggiornata è sempre quella dimenticata.
 */
export async function scegliDocumento(): Promise<FileScelto | null> {
  const esito = await SelettoreDocumenti.getDocumentAsync({
    type: FORMATI_AMMESSI,
    copyToCacheDirectory: true,
  });
  if (esito.canceled) return null;

  const scelto = esito.assets[0];
  if (!scelto) return null;

  return {
    uri: scelto.uri,
    nome: scelto.name,
    tipo: tipoAllegatoDa(scelto.mimeType),
    mimeType: scelto.mimeType ?? MIME_DI_RIPIEGO,
    dimensione: scelto.size ?? 0,
  };
}
