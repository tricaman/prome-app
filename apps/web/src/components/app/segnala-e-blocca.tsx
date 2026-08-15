'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  bloccaUtente,
  segnalaContenuto,
  type CreaSegnalazioneDtoMotivo,
  type CreaSegnalazioneDtoTipo,
} from '@prome/api-client';
import { useApiMutation } from '@/hooks';
import { Button } from '@/components/ui';
import { percorsi } from '@/content';
import { Link } from '@/i18n/navigazione';
import { cn } from '@/lib/utils';

const MOTIVI = ['SPAM', 'MOLESTIE', 'CONTENUTO_INAPPROPRIATO'] as const;

export interface SegnalaEBloccaProps {
  /** Cosa si sta segnalando. */
  tipo: CreaSegnalazioneDtoTipo;
  soggettoId: string;
  /** L'autore del contenuto, per il blocco. */
  autore: { utenteId: string; nome: string };
  /** Dopo il blocco il contenuto non esiste più per chi guarda: chi monta decide dove andare. */
  onBloccato?: () => void;
  /** Chiavi da invalidare quando il blocco riesce (feed, commenti…). */
  invalidaAlBlocco?: readonly (readonly unknown[])[];
  className?: string;
}

/**
 * «Segnala» e, dentro il pannello, «Blocca {nome}».
 *
 * Un'affordance sola per contenuto — il pannello si apre sul posto, stile di
 * casa: niente dialog — e due esiti dentro: la segnalazione con il motivo da
 * un elenco chiuso, e il blocco con conferma a due passi, perché il blocco
 * porta via dalla vista tutto ciò che quella persona ha scritto.
 *
 * Il pannello non compare mai sui propri contenuti né su quelli di un autore
 * rimosso: la condizione sta in chi lo monta, perché è chi monta a sapere chi
 * sta guardando. E non si mostra il motivo scelto dopo l'invio: la conferma
 * è il messaggio del server, già tradotto, con la stessa promessa delle
 * linee guida — entro 24 ore.
 */
export function SegnalaEBlocca({
  tipo,
  soggettoId,
  autore,
  onBloccato,
  invalidaAlBlocco = [],
  className,
}: SegnalaEBloccaProps) {
  const t = useTranslations('app.segnala');
  const [aperto, setAperto] = useState(false);
  const [confermaBlocco, setConfermaBlocco] = useState(false);

  const segnala = useApiMutation({
    mutationFn: (motivo: CreaSegnalazioneDtoMotivo) =>
      segnalaContenuto({ tipo, soggettoId, motivo }),
    onSuccess: () => {
      setAperto(false);
      setConfermaBlocco(false);
    },
  });

  const blocca = useApiMutation({
    mutationFn: () => bloccaUtente(autore.utenteId),
    invalida: invalidaAlBlocco as never[],
    onSuccess: () => {
      setAperto(false);
      setConfermaBlocco(false);
      onBloccato?.();
    },
  });

  if (!aperto) {
    return (
      <button
        type="button"
        onClick={() => setAperto(true)}
        className={cn(
          'text-[12px] font-semibold text-testo-debole transition-colors hover:text-testo',
          className,
        )}
      >
        {t('segnala')}
      </button>
    );
  }

  return (
    <div
      role="group"
      aria-label={t('segnala')}
      className={cn(
        'rounded-2xl border border-bordo bg-superficie-alt px-3.5 py-3',
        className,
      )}
    >
      <p className="text-[13px] font-extrabold text-testo">{t('titolo')}</p>
      <p className="mt-0.5 text-[12px] leading-relaxed text-testo-tenue">
        {t('testo')}{' '}
        <Link
          href={percorsi.lineeGuida()}
          target="_blank"
          className="font-semibold underline underline-offset-2"
        >
          {t('lineeGuida')}
        </Link>
      </p>

      <div className="mt-2.5 flex flex-wrap gap-2">
        {MOTIVI.map((motivo) => (
          <Button
            key={motivo}
            variante="contorno"
            size="sm"
            inCaricamento={segnala.isPending && segnala.variables === motivo}
            isDisabled={segnala.isPending || blocca.isPending}
            onPress={() => segnala.mutate(motivo)}
          >
            {t(`motivi.${motivo}`)}
          </Button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-bordo pt-3">
        {confermaBlocco ? (
          <>
            <span className="text-[12px] font-semibold text-testo-tenue">
              {t('bloccaConferma')}
            </span>
            <Button
              variante="distruttiva"
              size="sm"
              inCaricamento={blocca.isPending}
              onPress={() => blocca.mutate(undefined)}
            >
              {t('bloccaDavvero')}
            </Button>
          </>
        ) : (
          <Button
            variante="fantasma"
            size="sm"
            className="text-errore"
            isDisabled={segnala.isPending}
            onPress={() => setConfermaBlocco(true)}
          >
            {t('blocca', { nome: autore.nome })}
          </Button>
        )}
        <Button
          variante="fantasma"
          size="sm"
          className="ml-auto"
          onPress={() => {
            setAperto(false);
            setConfermaBlocco(false);
          }}
        >
          {t('annulla')}
        </Button>
      </div>
    </div>
  );
}
