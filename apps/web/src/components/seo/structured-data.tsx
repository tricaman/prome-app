import { getTranslations } from 'next-intl/server';
import type { Lingua } from '@prome/i18n';
import type { OggettoSchema } from '@/lib/schema';
import { organizzazione, sitoWeb } from '@/lib/schema';

/**
 * Dati strutturati (JSON-LD).
 *
 * Descrivono a un motore di ricerca cosa c'è nella pagina, in un formato che
 * sa leggere: è quello che permette al risultato di mostrare autore, data o
 * numero di partecipanti invece di un frammento pescato a caso.
 *
 * Ogni pagina passa i propri oggetti; organizzazione e sito sono aggiunti qui
 * perché valgono per tutte e non ha senso ripeterli.
 */
export async function StructuredData({
  lingua,
  oggetti = [],
}: {
  lingua: Lingua;
  oggetti?: readonly (OggettoSchema | undefined)[];
}) {
  const t = await getTranslations({ locale: lingua, namespace: 'meta' });

  const grafo = [
    organizzazione(t('descrizione')),
    sitoWeb(lingua, t('titoloBreve'), t('descrizione')),
    ...oggetti.filter((oggetto): oggetto is OggettoSchema => oggetto !== undefined),
  ];

  return (
    <script
      type="application/ld+json"
      // Contenuto costruito da noi, non da input utente.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({ '@context': 'https://schema.org', '@graph': grafo }),
      }}
    />
  );
}
