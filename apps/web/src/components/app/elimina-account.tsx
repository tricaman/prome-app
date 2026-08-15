'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import { chiudiSessione, useApiMutation } from '@prome/app-core';
import { richiediCancellazioneAccount } from '@prome/api-client';
import { useRouter } from '@/i18n/navigazione';
import { percorsi } from '@/content';
import { Button, Card, Heading, Input } from '@/components/ui';

/**
 * L'eliminazione dell'account, in fondo alle impostazioni.
 *
 * L'azione distruttiva è raggiungibile ma non invitante: bordo rosa, non un
 * bottone rosso pieno che chiede di essere premuto. La conferma è una
 * rivelazione progressiva con la stessa parola digitata dell'app mobile — un
 * dialog sarebbe una superficie nuova per un solo uso, e porterebbe la
 * conferma lontano dal testo legale che la spiega.
 *
 * Dopo il successo si atterra sulla home PUBBLICA, non su /app/accedi: la
 * schermata di accesso inviterebbe a rifare login, e un nuovo accesso entro
 * 14 giorni annulla la cancellazione appena chiesta.
 */
export function EliminaAccount() {
  const t = useTranslations('app.impostazioni.elimina');
  const tComune = useTranslations('comune');
  const router = useRouter();
  const queryClient = useQueryClient();
  const [aperta, setAperta] = useState(false);
  const [conferma, setConferma] = useState('');

  const parola = t('parola');
  const puoEliminare = conferma.trim().toUpperCase() === parola;

  const elimina = useApiMutation({
    mutationFn: () => richiediCancellazioneAccount(),
    onSuccess: async () => {
      // Prima si chiude la sessione (il server ha già revocato tutto), poi si
      // esce dall'area privata, e SOLO DOPO si svuota la cache: svuotarla
      // prima rimetterebbe in fetch query montate ormai senza token.
      await chiudiSessione();
      router.replace(percorsi.home());
      queryClient.clear();
    },
  });

  return (
    <Card padding="md" className="border-[1.5px] border-tinta-rosa-bordo">
      <Heading taglia="xs">{t('titolo')}</Heading>
      <p className="mb-4 mt-2.5 text-[13.5px] leading-[1.7] text-testo-tenue">{t('testo')}</p>

      {aperta ? (
        <div className="flex flex-col gap-3">
          <Input
            etichetta={t('scriviPerConfermare', { parola })}
            valore={conferma}
            onChange={setConferma}
            segnaposto={parola}
            autoComplete="off"
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variante="distruttiva"
              isDisabled={!puoEliminare}
              inCaricamento={elimina.isPending}
              onPress={() => elimina.mutate(undefined)}
            >
              {t('azione')}
            </Button>
            <Button
              variante="fantasma"
              onPress={() => {
                setAperta(false);
                setConferma('');
              }}
            >
              {tComune('annulla')}
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAperta(true)}
          className="h-11 rounded-xl border-[1.5px] border-tinta-rosa-bordo bg-tinta-rosa-velo px-5 text-[13.5px] font-extrabold text-tinta-rosa-testo"
        >
          {t('azione')}
        </button>
      )}
    </Card>
  );
}
