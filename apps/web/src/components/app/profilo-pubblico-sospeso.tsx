'use client';

import { useTranslations } from 'next-intl';
import { SEGNAPOSTO_PROFILO_PUBBLICO, gestoSospeso } from '@/lib/segnaposto';
import { Button, Icona } from '@/components/ui';

/**
 * «Vedi profilo pubblico», spento.
 *
 * La domanda che pone — *cosa vedono gli altri di me?* — è la più sensata che
 * una pagina di profilo possa offrire, ed è il motivo per cui il bottone resta
 * nel disegno. Ma la pagina a cui porterebbe **non esiste e non è in ritardo**:
 * è fuori dal prodotto per decisione dichiarata. Nessun contenuto degli utenti
 * è raggiungibile da chi non ha un account — post, aule, gruppi, materiali e
 * profili — e «Pubblico», in questo prodotto, significa aperto agli iscritti a
 * Prome, mai al web.
 *
 * Servirebbe anche un `GET /profilo/:id`, che non c'è: le altre persone si
 * conoscono solo attraverso i contenuti che hanno scritto.
 *
 * Spento e con la sua ragione a portata di puntatore è meglio che assente: se
 * sparisse, la prossima volta che qualcuno disegna questa pagina lo rimetterebbe
 * senza sapere che era stato tolto apposta.
 */
export function ProfiloPubblicoSospeso() {
  const t = useTranslations('app.profilo');
  const tComune = useTranslations('comune');

  return (
    <span title={tComune('presto')} className="inline-flex">
      <Button
        variante="contorno"
        size="sm"
        isDisabled
        onPress={gestoSospeso(SEGNAPOSTO_PROFILO_PUBBLICO)}
        iconaSinistra={<Icona nome="collegamento" dimensione={16} />}
      >
        {t('vediPubblico')}
      </Button>
    </span>
  );
}
