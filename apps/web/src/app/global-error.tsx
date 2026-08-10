'use client';

import { useEffect } from 'react';
import { catalogoDi, LINGUA_DI_RIPIEGO } from '@prome/i18n';
import { temaScuro } from '@prome/design-tokens';

/**
 * Ultima rete di sicurezza: entra in gioco quando fallisce il layout stesso,
 * quindi non può contare su niente di ciò che l'applicazione monta di solito —
 * né tema, né traduzioni caricate per richiesta, né componenti.
 *
 * Per questo scrive il proprio `<html>`, usa i testi della lingua di ripiego e
 * gli stili in linea: è la differenza tra una schermata bianca e una pagina
 * che almeno dice cosa è successo e come uscirne.
 */
export default function ErroreGlobale({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const messaggi = catalogoDi(LINGUA_DI_RIPIEGO);

  useEffect(() => {
    console.error('[prome] errore globale', error);
  }, [error]);

  return (
    <html lang={LINGUA_DI_RIPIEGO}>
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          padding: '24px',
          backgroundColor: temaScuro.sfondo,
          color: temaScuro.testo,
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          textAlign: 'center',
        }}
      >
        <main style={{ maxWidth: '32rem', display: 'grid', gap: '16px' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>
            {messaggi.errori.generico.titolo}
          </h1>
          <p style={{ margin: 0, color: temaScuro.testoTenue }}>
            {messaggi.errori.generico.descrizione}
          </p>
          <div>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                border: 0,
                cursor: 'pointer',
                borderRadius: '9999px',
                padding: '12px 24px',
                fontWeight: 700,
                backgroundColor: temaScuro.primario,
                color: temaScuro.primarioTesto,
              }}
            >
              {messaggi.comune.riprova}
            </button>
          </div>
          {error.digest ? (
            <p style={{ margin: 0, fontSize: '0.75rem', color: temaScuro.testoDebole }}>
              {messaggi.errori.riferimento.replace('{id}', error.digest)}
            </p>
          ) : null}
        </main>
      </body>
    </html>
  );
}
