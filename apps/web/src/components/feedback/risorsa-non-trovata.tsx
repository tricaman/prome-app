'use client';

import { useTranslations } from 'next-intl';
import { percorsiApp } from '@/lib/percorsi-app';
import { useRouter } from '@/i18n/navigazione';
import { EmptyState } from './empty-state';

/**
 * «Questo contenuto non c'è più» — la fine giusta per un collegamento vecchio.
 *
 * Un post eliminato, un invito scaduto, un gruppo sciolto: la notifica o il
 * segnalibro che ci puntavano restano, e chi li apre non ha sbagliato niente.
 * Per questo NON c'è «Riprova» — riprovare un 404 produce lo stesso 404, e un
 * bottone che non può riuscire insegna solo a non fidarsi dei bottoni. Si
 * offre l'unica strada vera: tornare in bacheca.
 *
 * Il 404 si riconosce dallo **status** (`statusErrore`), mai dai codici di
 * dominio: «non trovato» è la stessa classe di risposta in ogni contesto.
 */
export function RisorsaNonTrovata() {
  const t = useTranslations('errori.risorsaNonTrovata');
  const router = useRouter();

  return (
    <EmptyState
      titolo={t('titolo')}
      descrizione={t('descrizione')}
      azione={{ etichetta: t('azione'), onClick: () => router.push(percorsiApp.bacheca()) }}
    />
  );
}
