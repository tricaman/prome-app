/**
 * Il file da mandare all'archivio.
 *
 * Sul web è un `File` del browser, sull'app è un oggetto con indirizzo locale,
 * nome e tipo: `XMLHttpRequest` accetta entrambi, e questa forma è ciò che
 * hanno in comune.
 */
export type CorpoDaCaricare = Blob | { uri: string; name: string; type: string };

export interface OpzioniCaricamento {
  url: string;
  corpo: CorpoDaCaricare;
  intestazioni?: Record<string, string>;
  /** Chiamato con 0–100 mentre i byte salgono. */
  onAvanzamento?: (percentuale: number) => void;
}

/**
 * Manda i byte all'archivio, riportando l'avanzamento.
 *
 * Usa `XMLHttpRequest` e non `fetch` per una ragione sola: `fetch` non espone
 * l'avanzamento del **caricamento**, e senza quello la barra sarebbe finta.
 * È l'unica ragione, e vale identica sui due client — che è il motivo per cui
 * questa funzione sta qui e non due volte.
 *
 * I byte vanno **direttamente all'archivio**: questa funzione non passa dagli
 * endpoint di dominio e non conosce il client API.
 */
export function caricaConAvanzamento({
  url,
  corpo,
  intestazioni = {},
  onAvanzamento,
}: OpzioniCaricamento): Promise<void> {
  return new Promise((risolvi, rifiuta) => {
    const richiesta = new XMLHttpRequest();
    richiesta.open('PUT', url);

    for (const [nome, valore] of Object.entries(intestazioni)) {
      richiesta.setRequestHeader(nome, valore);
    }

    richiesta.upload.addEventListener('progress', (evento) => {
      if (evento.lengthComputable && onAvanzamento) {
        onAvanzamento(Math.round((evento.loaded / evento.total) * 100));
      }
    });

    richiesta.addEventListener('load', () => {
      if (richiesta.status >= 200 && richiesta.status < 300) risolvi();
      else rifiuta(new Error(`Caricamento rifiutato (${richiesta.status})`));
    });
    richiesta.addEventListener('error', () => rifiuta(new Error('Caricamento interrotto')));
    richiesta.addEventListener('abort', () => rifiuta(new Error('Caricamento annullato')));

    richiesta.send(corpo as XMLHttpRequestBodyInit);
  });
}

/**
 * Il tipo di allegato, dal tipo MIME dichiarato dal sistema.
 *
 * `null` significa «non ammesso»: la regola sta in un punto solo perché è la
 * stessa che il server applica, e due elenchi divergono al primo formato
 * aggiunto.
 */
export function tipoAllegatoDa(mime: string | undefined): 'PDF' | 'IMMAGINE' | 'TESTO' | null {
  if (!mime) return null;
  if (mime === 'application/pdf') return 'PDF';
  if (mime.startsWith('image/')) return 'IMMAGINE';
  if (mime.startsWith('text/')) return 'TESTO';
  return null;
}

/** Peso leggibile: «2,4 MB» invece di 2517892. */
export function pesoLeggibile(byte: number): string {
  const mb = byte / 1024 / 1024;
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(byte / 1024))} KB`;
}
