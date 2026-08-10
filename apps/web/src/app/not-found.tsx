import { catalogoDi, LINGUA_DI_RIPIEGO } from '@prome/i18n';

/**
 * Percorso fuori da ogni lingua (per esempio `/xx/qualcosa`): qui non c'è
 * ancora un contesto di lingua, quindi si usano i testi di ripiego.
 */
export default function NonTrovatoGlobale() {
  const messaggi = catalogoDi(LINGUA_DI_RIPIEGO);

  return (
    <html lang={LINGUA_DI_RIPIEGO}>
      <body className="grid min-h-screen place-items-center bg-sfondo p-6 text-center text-testo">
        <main className="grid max-w-lg gap-3">
          <h1 className="font-display text-2xl font-extrabold">
            {messaggi.errori.nonTrovato.titolo}
          </h1>
          <p className="text-testo-tenue">{messaggi.errori.nonTrovato.descrizione}</p>
          <p>
            <a
              href={`/${LINGUA_DI_RIPIEGO}`}
              className="inline-block rounded-full bg-primario px-6 py-3 font-bold text-primario-testo"
            >
              {messaggi.errori.nonTrovato.azione}
            </a>
          </p>
        </main>
      </body>
    </html>
  );
}
