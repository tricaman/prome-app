import { createHmac, timingSafeEqual } from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { Injectable, Logger } from '@nestjs/common';
import type { TipoAllegato } from '@prome/contracts';
import { env } from '../../config/env';
import {
  DURATA_PREAUTORIZZAZIONE_SECONDI,
  type ArchivioDiFile,
  type Preautorizzazione,
} from './archivio-file';

/**
 * Archivio su disco locale, con caricamento diretto firmato.
 *
 * Serve a lavorare — e a provare l'intero percorso — senza un fornitore di
 * archiviazione configurato. **Il flusso è quello vero**: pre-autorizzazione
 * con firma e scadenza, caricamento diretto verso un indirizzo dedicato, i
 * byte che non passano dagli endpoint di dominio. Cambia soltanto dove
 * atterrano, quindi sostituire questo adattatore non cambia né i controller né
 * la Bacheca.
 *
 * La firma non è decorativa: senza, l'indirizzo di caricamento sarebbe una
 * scrittura aperta a chiunque conosca il percorso.
 */
@Injectable()
export class ArchivioLocale implements ArchivioDiFile {
  private readonly logger = new Logger('ArchivioDiFile');
  private readonly radice = path.resolve(env.ARCHIVIO_LOCALE_PERCORSO);

  preautorizzaCaricamento(chiave: string, tipo: TipoAllegato): Promise<Preautorizzazione> {
    const scadeIl = new Date(Date.now() + DURATA_PREAUTORIZZAZIONE_SECONDI * 1000);
    const scadenza = Math.floor(scadeIl.getTime() / 1000);
    const firma = this.firma(chiave, scadenza);

    return Promise.resolve({
      url: `${env.BETTER_AUTH_URL}/archivio/${chiave}?scadenza=${scadenza}&firma=${firma}`,
      metodo: 'PUT',
      intestazioni: { 'content-type': tipoMime(tipo) },
      scadeIl,
    });
  }

  async eStatoCaricato(chiave: string): Promise<boolean> {
    try {
      const stato = await fs.stat(this.percorsoDi(chiave));
      return stato.isFile() && stato.size > 0;
    } catch {
      return false;
    }
  }

  async dimensioneDi(chiave: string): Promise<number | null> {
    try {
      const stato = await fs.stat(this.percorsoDi(chiave));
      return stato.isFile() ? stato.size : null;
    } catch {
      return null;
    }
  }

  urlDiLettura(chiave: string): string {
    return `${env.BETTER_AUTH_URL}/archivio/${chiave}`;
  }

  async rimuovi(chiave: string): Promise<void> {
    await fs.rm(this.percorsoDi(chiave), { force: true });
  }

  // --- usato dall'endpoint di caricamento, non dal dominio -----------------

  /**
   * Scrive i byte, dopo aver verificato firma e scadenza.
   *
   * Ritorna `false` se l'autorizzazione non regge: chi chiama risponde 403 e
   * non dice altro, perché distinguere «firma sbagliata» da «scaduta» aiuta
   * solo chi sta provando a indovinare.
   */
  async scriviSeAutorizzato(
    chiave: string,
    scadenza: number,
    firma: string,
    contenuto: Buffer,
  ): Promise<boolean> {
    if (!Number.isFinite(scadenza) || scadenza * 1000 < Date.now()) return false;
    if (!this.firmaValida(chiave, scadenza, firma)) return false;

    const destinazione = this.percorsoDi(chiave);
    await fs.mkdir(path.dirname(destinazione), { recursive: true });
    await fs.writeFile(destinazione, contenuto);
    this.logger.log(`File archiviato (${contenuto.byteLength} byte)`);
    return true;
  }

  /** Legge i byte, o `null` se la chiave non esiste. */
  async leggi(chiave: string): Promise<Buffer | null> {
    try {
      return await fs.readFile(this.percorsoDi(chiave));
    } catch {
      return null;
    }
  }

  private firma(chiave: string, scadenza: number): string {
    return createHmac('sha256', env.BETTER_AUTH_SECRET)
      .update(`${chiave}:${scadenza}`)
      .digest('hex');
  }

  /**
   * Confronto a tempo costante: un confronto normale si ferma al primo
   * carattere diverso, e la differenza di tempo racconta quanti ne erano
   * giusti.
   */
  private firmaValida(chiave: string, scadenza: number, ricevuta: string): boolean {
    const attesa = Buffer.from(this.firma(chiave, scadenza));
    const data = Buffer.from(ricevuta ?? '');
    return attesa.length === data.length && timingSafeEqual(attesa, data);
  }

  /**
   * Dalla chiave al percorso su disco, restando dentro la radice.
   *
   * La chiave la costruiamo noi, ma questo controllo c'è comunque: il giorno
   * in cui una chiave arrivasse da fuori, `../../` porterebbe la scrittura
   * dove non deve andare, e il difetto si vedrebbe solo dopo.
   */
  private percorsoDi(chiave: string): string {
    const destinazione = path.resolve(this.radice, chiave);
    if (destinazione !== this.radice && !destinazione.startsWith(this.radice + path.sep)) {
      throw new Error('Chiave di archiviazione fuori dalla radice');
    }
    return destinazione;
  }
}

/** Tipo MIME dichiarato nel caricamento. */
function tipoMime(tipo: TipoAllegato): string {
  if (tipo === 'PDF') return 'application/pdf';
  if (tipo === 'IMMAGINE') return 'image/*';
  return 'text/plain';
}
