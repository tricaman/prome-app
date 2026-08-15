'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  eliminaAulaStudio,
  getApriSalaAulaStudioQueryKey,
  getElencaAuleStudioQueryKey,
  modificaAulaStudio,
  rimuoviPartecipante,
  useElencaMieiGruppi,
  type AulaStudioDto,
  type ModificaAulaStudioDtoVisibilita,
} from '@prome/api-client';
import { useApiMutation } from '@/hooks';
import { percorsiApp } from '@/lib/percorsi-app';
import { useRouter } from '@/i18n/navigazione';
import { Button, Card, Input } from '@/components/ui';
import { cn } from '@/lib/utils';

const VISIBILITA: readonly {
  valore: ModificaAulaStudioDtoVisibilita;
  chiave: 'privato' | 'ateneo' | 'pubblico';
}[] = [
  { valore: 'PRIVATO', chiave: 'privato' },
  { valore: 'ATENEO', chiave: 'ateneo' },
  { valore: 'PUBBLICO', chiave: 'pubblico' },
];

/**
 * Le impostazioni dell'aula, per chi la modera.
 *
 * L'API le aveva da agosto e non c'era modo di raggiungerle: la visibilità di
 * un'aula si decideva una volta per sempre, e un'aula aperta per sbaglio
 * restava nell'elenco di chi l'aveva creata.
 *
 * **La collocazione in un gruppo è qui e non altrove** perché è una decisione
 * sull'aula: chi ne fa parte entra senza invito, e concederlo è un gesto di
 * chi modera l'aula, non di chi modera il gruppo. L'elenco propone **solo i
 * gruppi di cui si fa parte**, perché è ciò che l'API esige — mostrarne altri
 * sarebbe un rifiuto annunciato.
 */
export function ImpostazioniAula({ aula }: { aula: AulaStudioDto }) {
  const t = useTranslations('app.sala.impostazioni');
  const tVisibilita = useTranslations('app.aule.modale.visibilita');
  const router = useRouter();

  const [titolo, setTitolo] = useState(aula.titolo);
  const [visibilita, setVisibilita] = useState(aula.visibilita);
  const [quando, setQuando] = useState(
    aula.dataOraInizio ? aula.dataOraInizio.slice(0, 16) : '',
  );
  const [gruppoId, setGruppoId] = useState(aula.gruppoId ?? '');

  const gruppi = useElencaMieiGruppi({ limit: 50 });
  const chiavi = [
    getApriSalaAulaStudioQueryKey(aula.id) as never,
    getElencaAuleStudioQueryKey() as never,
  ];

  const salva = useApiMutation({
    mutationFn: () =>
      modificaAulaStudio(aula.id, {
        titolo,
        visibilita,
        // `null` scioglie la collocazione, un id la stabilisce (AS9).
        gruppoId: gruppoId || null,
        ...(quando ? { dataOraInizio: new Date(quando).toISOString() } : { dataOraInizio: null }),
      }),
    invalida: chiavi,
  });

  const elimina = useApiMutation({
    mutationFn: () => eliminaAulaStudio(aula.id),
    invalida: [getElencaAuleStudioQueryKey() as never],
    onSuccess: () => router.push(percorsiApp.auleStudio()),
  });

  return (
    <div className="mx-auto w-full max-w-[620px] py-5">
      <Card padding="md" className="mb-4">
        <p className="mb-3.5 text-[15px] font-extrabold text-testo">{t('titolo')}</p>

        <Input etichetta={t('campoTitolo')} valore={titolo} onChange={setTitolo} />

        <p className="mb-2 mt-4 text-[12.5px] font-extrabold text-testo-tenue">
          {t('chiPuoEntrare')}
        </p>
        <div className="grid gap-2.5 sm:grid-cols-3">
          {VISIBILITA.map((opzione) => {
            // Un'aula nata senza ateneo non può essere riservata all'ateneo:
            // il campo è congelato alla creazione, e offrire la scelta
            // vorrebbe dire offrire un'aula visibile a nessuno.
            const impossibile = opzione.valore === 'ATENEO' && !aula.ateneo;
            const scelta = opzione.valore === visibilita;
            return (
              <button
                key={opzione.valore}
                type="button"
                aria-pressed={scelta}
                disabled={impossibile}
                onClick={() => setVisibilita(opzione.valore)}
                className={cn(
                  'rounded-[14px] border-2 p-3 text-left transition-colors',
                  scelta
                    ? 'border-primary-500 bg-tinta-menta-velo'
                    : 'border-bordo bg-superficie hover:border-tinta-menta-bordo',
                  impossibile && 'cursor-not-allowed opacity-50',
                )}
              >
                <span className="block text-[13.5px] font-extrabold text-testo">
                  {tVisibilita(`${opzione.chiave}Titolo`)}
                </span>
                <span className="mt-1 block text-[11.5px] leading-snug text-testo-tenue">
                  {tVisibilita(opzione.chiave)}
                </span>
              </button>
            );
          })}
        </div>
        {!aula.ateneo ? (
          <p className="mt-2 text-[11.5px] text-testo-debole">{t('ateneoNonDisponibile')}</p>
        ) : null}

        <label className="mt-4 block">
          <span className="mb-1.5 block text-[12.5px] font-extrabold text-testo-tenue">
            {t('programma')}
          </span>
          <input
            type="datetime-local"
            value={quando}
            onChange={(evento) => setQuando(evento.target.value)}
            className="h-[46px] w-full rounded-[14px] border-2 border-bordo bg-superficie px-3.5 text-[14.5px] outline-none focus:border-primary-500"
          />
          <span className="mt-1 block text-[11.5px] text-testo-debole">{t('senzaData')}</span>
        </label>

        <p className="mb-1.5 mt-4 text-[12.5px] font-extrabold text-testo-tenue">{t('gruppo')}</p>
        <select
          value={gruppoId}
          onChange={(evento) => setGruppoId(evento.target.value)}
          className="h-[46px] w-full rounded-[14px] border-2 border-bordo bg-superficie px-3 text-[14.5px] outline-none focus:border-primary-500"
        >
          <option value="">{t('nessunGruppo')}</option>
          {(gruppi.data?.data ?? []).map((gruppo) => (
            <option key={gruppo.id} value={gruppo.id}>
              {gruppo.nome}
            </option>
          ))}
        </select>
        <p className="mt-1 text-[11.5px] text-testo-debole">{t('gruppoAiuto')}</p>

        <div className="mt-5 flex justify-end">
          <Button
            className="h-11 rounded-xl px-5"
            inCaricamento={salva.isPending}
            onPress={() => salva.mutate(undefined)}
          >
            {t('salva')}
          </Button>
        </div>
      </Card>

      <Card padding="md" className="border-tinta-rosa-bordo">
        <p className="text-[15px] font-extrabold text-testo">{t('elimina')}</p>
        <p className="mb-3 mt-1 text-[12.5px] leading-relaxed text-testo-tenue">
          {t('eliminaAiuto')}
        </p>
        <Button
          variante="contorno"
          className="h-10 rounded-xl px-4 text-[13px]"
          inCaricamento={elimina.isPending}
          onPress={() => elimina.mutate(undefined)}
        >
          {t('elimina')}
        </Button>
      </Card>
    </div>
  );
}

/**
 * Uscire dall'aula, per chiunque ne faccia parte.
 *
 * Era l'unica delle operazioni mancanti che colpisse ogni partecipante e non
 * chi amministra: si entrava in un'aula pubblica e non se ne usciva più.
 * L'ultimo moderatore riceve il rifiuto del server (AS2) con il suo messaggio,
 * che dice cosa fare — promuovere qualcuno.
 */
export function EsciDallAula({ aulaId, utenteId }: { aulaId: string; utenteId: string }) {
  const t = useTranslations('app.sala.impostazioni');
  const router = useRouter();

  const esci = useApiMutation({
    mutationFn: () => rimuoviPartecipante(aulaId, utenteId),
    invalida: [getElencaAuleStudioQueryKey() as never],
    onSuccess: () => router.push(percorsiApp.auleStudio()),
  });

  return (
    <Card padding="md" className="mx-auto mt-4 w-full max-w-[620px]">
      <p className="text-[15px] font-extrabold text-testo">{t('esci')}</p>
      <p className="mb-3 mt-1 text-[12.5px] leading-relaxed text-testo-tenue">{t('esciAiuto')}</p>
      <Button
        variante="contorno"
        className="h-10 rounded-xl px-4 text-[13px]"
        inCaricamento={esci.isPending}
        onPress={() => esci.mutate(undefined)}
      >
        {t('esci')}
      </Button>
    </Card>
  );
}
