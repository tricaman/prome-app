import { router } from 'expo-router';
import { rotte } from '@/content';
import { useT } from '@/i18n/i18n-provider';
import { EmptyState } from './empty-state';

/**
 * «Questo contenuto non c'è più» — la fine giusta per un collegamento vecchio.
 *
 * Un post eliminato, un invito scaduto, un gruppo sciolto: la notifica che ci
 * puntava resta, e chi la tocca non ha sbagliato niente. Per questo NON c'è
 * «Riprova» — riprovare un 404 produce lo stesso 404, e un bottone che non
 * può riuscire insegna solo a non fidarsi dei bottoni. Si offre l'unica
 * strada vera: tornare in bacheca.
 *
 * Il 404 si riconosce dallo **status** (`statusErrore`), mai dai codici di
 * dominio: «non trovato» è la stessa classe di risposta in ogni contesto.
 */
export function RisorsaNonTrovata() {
  const t = useT();

  return (
    <EmptyState
      titolo={t('errori.risorsaNonTrovata.titolo')}
      descrizione={t('errori.risorsaNonTrovata.descrizione')}
      azione={{
        etichetta: t('errori.risorsaNonTrovata.azione'),
        onPress: () => router.replace(rotte.bacheca()),
      }}
    />
  );
}
