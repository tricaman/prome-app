import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { ImageResponse } from 'next/og';
import { COLORE_MARCHIO, temaScuro } from '@prome/design-tokens';
import { catalogoDi, eLinguaSupportata, LINGUA_DI_RIPIEGO } from '@prome/i18n';

/**
 * Il marchio, letto dal file accanto a questo.
 *
 * Va letto dal disco e incorporato come dati: a disegnare l'anteprima è il
 * server stesso, che non ha motivo di scaricare da sé un file che ha già. È un
 * PNG e non l'SVG perché il motore che compone l'immagine lavora su mappe di
 * pixel.
 *
 * Il percorso va convertito in stringa: il `fs` con cui gira questo modulo non
 * accetta un oggetto `URL`, e la lettura falliva **solo durante la build** —
 * un errore che non si vede in sviluppo e che lascia senza anteprima ogni
 * collegamento condiviso.
 *
 * La lettura è avviata al primo disegno e non all'importazione: se fallisse
 * all'importazione, il modulo intero fallirebbe con lei.
 */
let logo: Promise<string> | undefined;

function marchioIncorporato(): Promise<string> {
  logo ??= readFile(fileURLToPath(new URL('./logo-anteprima.png', import.meta.url))).then(
    (dati) => `data:image/png;base64,${dati.toString('base64')}`,
  );
  return logo;
}

/**
 * Anteprima mostrata quando un collegamento viene condiviso.
 *
 * È generata dal codice invece che da un file statico, così resta allineata al
 * marchio e ai testi tradotti senza dover riesportare un'immagine ogni volta.
 */
export const alt = 'Prome';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function AnteprimaSocial({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const lingua = eLinguaSupportata(locale) ? locale : LINGUA_DI_RIPIEGO;
  const messaggi = catalogoDi(lingua);
  const marchio = await marchioIncorporato();

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 28,
          padding: 96,
          backgroundColor: temaScuro.sfondo,
          color: temaScuro.testo,
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <img src={marchio} width={64} height={64} alt="" />
          <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: -1 }}>prome</div>
        </div>

        <div style={{ display: 'flex', fontSize: 84, fontWeight: 800, letterSpacing: -2 }}>
          <span>{messaggi.sito.motto1}&nbsp;</span>
          <span style={{ color: COLORE_MARCHIO }}>{messaggi.sito.motto2}</span>
        </div>

        <div style={{ fontSize: 32, color: temaScuro.testoTenue, maxWidth: 900 }}>
          {messaggi.meta.descrizione}
        </div>
      </div>
    ),
    size,
  );
}
