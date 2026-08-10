import { ImageResponse } from 'next/og';
import { COLORE_MARCHIO, temaScuro } from '@prome/design-tokens';
import { catalogoDi, eLinguaSupportata, LINGUA_DI_RIPIEGO } from '@prome/i18n';

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
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 999,
              backgroundColor: COLORE_MARCHIO,
            }}
          />
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
