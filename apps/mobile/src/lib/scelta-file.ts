import * as SelettoreDocumenti from 'expo-document-picker';
import * as SelettoreFoto from 'expo-image-picker';
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

/** Estensione dedotta dal MIME, per le foto che arrivano senza nome. */
const ESTENSIONI: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

/**
 * Il rullino, dal selettore di sistema.
 *
 * Serve perché il selettore di documenti apre l'archivio dei file, e su iOS le
 * foto **non stanno lì**: caricare la foto degli appunti — il gesto più
 * naturale che si faccia da un telefono — richiedeva di passare dal computer.
 *
 * **Non chiede alcun permesso**: la selezione avviene nel selettore di
 * sistema, che consegna all'app la sola immagine scelta. Il modulo dichiara
 * comunque la libreria foto su iOS (Apple lo pretende appena il framework è
 * collegato) e in `app.json` fotocamera, microfono e archiviazione sono
 * bloccati: quello che resta dichiarato è ciò che serve, e non produce
 * richieste a schermo.
 *
 * Due ripieghi, perché il sistema può non dire tutto: senza nome se ne
 * costruisce uno con l'estensione **dedotta dal MIME** — un `.jpg` fisso
 * mentirebbe su un PNG o un HEIC — e senza MIME si assume JPEG, che è ciò che
 * un rullino restituisce quasi sempre.
 */
export async function scegliFoto(): Promise<FileScelto | null> {
  const esito = await SelettoreFoto.launchImageLibraryAsync({
    mediaTypes: ['images'],
    // Una alla volta, come il selettore di documenti: il caricamento a tre
    // tempi prenota una chiave per file, e il post ne ammette dieci.
    allowsMultipleSelection: false,
    // Nessuna ricompressione: si allega ciò che si è scelto.
    quality: 1,
  });
  if (esito.canceled) return null;

  const scelta = esito.assets[0];
  if (!scelta) return null;

  const mimeType = scelta.mimeType ?? 'image/jpeg';
  const nome = scelta.fileName ?? `foto-${Date.now()}.${ESTENSIONI[mimeType] ?? 'jpg'}`;

  return {
    uri: scelta.uri,
    nome,
    tipo: tipoAllegatoDa(mimeType),
    mimeType,
    dimensione: scelta.fileSize ?? 0,
  };
}
