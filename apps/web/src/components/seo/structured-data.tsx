import { getTranslations } from 'next-intl/server';
import type { Lingua } from '@prome/i18n';
import type { OggettoSchema } from '@/lib/schema';
import { organizzazione, persona, sitoWeb } from '@/lib/schema';

/**
 * Dati strutturati (JSON-LD).
 *
 * Descrivono a un motore di ricerca cosa c'è nella pagina, in un formato che
 * sa leggere: è quello che permette al risultato di mostrare autore, data o
 * percorso di navigazione invece di un frammento pescato a caso.
 *
 * **Chi dichiara cosa, e una volta sola.** L'identità del sito — chi lo
 * pubblica, chi l'ha fatto, come si chiama — la dichiara il layout di lingua
 * con `DatiStrutturatiDelSito`, perché vale per ogni pagina. Le pagine
 * dichiarano soltanto sé stesse: briciole, raccolta, articolo, ateneo. Prima
 * le emettevano entrambi, e ogni pagina arrivava con l'organizzazione e il
 * sito descritti due volte: nodi con lo stesso `@id` che un motore deve
 * riconciliare, e rumore in un formato che vale proprio per la sua precisione.
 */
export function StructuredData({
  oggetti = [],
}: {
  oggetti?: readonly (OggettoSchema | undefined)[];
}) {
  const definiti = oggetti.filter((oggetto): oggetto is OggettoSchema => oggetto !== undefined);
  if (definiti.length === 0) return null;

  return <GrafoJsonLd nodi={definiti} />;
}

/**
 * L'identità del sito: l'organizzazione, la persona che c'è dietro e il sito
 * stesso, legati fra loro dagli `@id`. Va montata una volta sola, nel layout.
 */
export async function DatiStrutturatiDelSito({ lingua }: { lingua: Lingua }) {
  const t = await getTranslations({ locale: lingua, namespace: 'meta' });

  return (
    <GrafoJsonLd
      nodi={[
        organizzazione(t('descrizione')),
        persona(lingua),
        sitoWeb(lingua, t('titoloBreve'), t('descrizione')),
      ]}
    />
  );
}

/**
 * Il tag vero e proprio.
 *
 * `</` viene neutralizzato: dentro un elemento `<script>` quella sequenza
 * chiuderebbe il tag prima del previsto, e i nostri testi redazionali sono
 * l'unico punto da cui potrebbe arrivare.
 */
function GrafoJsonLd({ nodi }: { nodi: readonly OggettoSchema[] }) {
  const json = JSON.stringify({ '@context': 'https://schema.org', '@graph': nodi }).replace(
    /</g,
    '\\u003c',
  );

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
