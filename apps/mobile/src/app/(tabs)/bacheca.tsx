import { useState } from 'react';
import { useLeggiMioProfilo } from '@prome/api-client';
import { router } from 'expo-router';
import { rotte } from '@/content';
import { useNonLette, useT } from '@/hooks';
import { FeedBacheca, useFeedBacheca } from '@/components/contenuti';
import { SchermataTab } from '@/components/app/schermata-tab';
import { FoglioCommenti } from '@/components/app/foglio-commenti';
import { AzioneTonda, PulsanteFluttuante } from '@/components/ui';

/**
 * Bacheca.
 *
 * Cornice, margini e trascinamento per aggiornare vengono da `SchermataTab`,
 * come nelle altre tre schede: prima questa era l'unica a disegnarsi la propria
 * intestazione e il proprio scorrimento, ed era il motivo per cui i suoi
 * margini non somigliavano a quelli di nessun'altra.
 *
 * Il profilo si rilegge insieme al feed: il saluto in cima è suo, e un
 * aggiornamento che lasciasse indietro il nome sarebbe un pezzo di schermo
 * fermo a prima.
 */
export default function SchedaBacheca() {
  const t = useT();

  const profilo = useLeggiMioProfilo();
  const nome = [profilo.data?.data.nome, profilo.data?.data.cognome].filter(Boolean).join(' ');
  // Solo il numero: il socket lo tiene la barra delle schede, che lo mostra
  // anche da un'altra scheda.
  const { nonLette } = useNonLette();
  const feed = useFeedBacheca();
  /** Di quale post si stanno leggendo i commenti: nessuno, finché non si tocca. */
  const [commentiDi, setCommentiDi] = useState<string | undefined>(undefined);

  return (
    <SchermataTab
      titolo={t('app.nav.bacheca')}
      // Il saluto compare solo quando il nome c'è davvero: durante il
      // caricamento resta il titolo, mai un nome di ripiego.
      sopraTitolo={nome ? `Ciao ${nome.split(' ')[0]} 👋` : undefined}
      azioni={
        <AzioneTonda
          icona="campana"
          etichetta={t('app.notifiche.apri')}
          conteggio={nonLette}
          onPress={() => router.push(rotte.notifiche())}
        />
      }
      query={feed}
      ancheQuery={[profilo]}
      eVuoto={(risposta) => risposta.pages.every((pagina) => pagina.data.length === 0)}
      azione={
        <PulsanteFluttuante
          etichetta={t('app.feed.pubblica')}
          onPress={() => router.push(rotte.componi())}
        />
      }
    >
      {(risposta) => (
        <>
          <FeedBacheca feed={feed} pagine={risposta.pages} onCommenti={setCommentiDi} />
          {/* Il foglio è un `Modal`: sta nell'albero qui, ma si disegna sopra
              tutto — comprese la barra delle schede e la chiamata
              fluttuante. */}
          <FoglioCommenti postId={commentiDi} onChiudi={() => setCommentiDi(undefined)} />
        </>
      )}
    </SchermataTab>
  );
}
