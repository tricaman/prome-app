'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  getElencaPostQueryKey,
  preautorizzaAllegato,
  pubblicaPost,
  type PreautorizzaAllegatoDto,
} from '@prome/api-client';
import { LUNGHEZZA_MASSIMA_POST } from '@prome/contracts';
import { caricaConAvanzamento, tipoAllegatoDa } from '@prome/app-core';
import { UTENTE } from '@/content';
import { useApiMutation } from '@/hooks';
import { Avatar, Button, Card, Icona } from '@/components/ui';
import { cn } from '@/lib/utils';

interface AllegatoInCorso {
  /** Identificativo locale: serve solo a distinguere le righe mentre caricano. */
  id: string;
  nome: string;
  /** 0–100. */
  avanzamento: number;
  /** La chiave arriva a caricamento finito: prima non esiste. */
  chiave?: string;
  errore?: string;
}

/**
 * Composer della bacheca.
 *
 * Sul web sta in cima al feed invece di essere nascosto dietro un pulsante
 * fluttuante: lo spazio c'è e scrivere è il comportamento da incoraggiare.
 * Si espande al primo tocco, così a riposo occupa una riga sola.
 *
 * Il file parte **appena scelto**, non alla pubblicazione: mentre si finisce
 * di scrivere il caricamento è già in corso, e al momento di pubblicare non
 * c'è quasi nulla da aspettare. È anche il motivo per cui il bottone resta
 * disabilitato finché un caricamento è a metà: pubblicare allora vorrebbe dire
 * citare una chiave che non ha ancora byte.
 */
export function Composer() {
  const t = useTranslations('app.feed');
  const [aperto, setAperto] = useState(false);
  const [testo, setTesto] = useState('');
  const [allegati, setAllegati] = useState<AllegatoInCorso[]>([]);
  const selettore = useRef<HTMLInputElement>(null);
  // Contatore invece dell'orologio: serve solo a distinguere le righe, e un
  // valore che cambia a ogni lettura non è qualcosa da chiamare nel corpo di
  // un componente.
  const prossimoId = useRef(0);
  const nome = UTENTE.nome.split(' ')[0] ?? UTENTE.nome;

  const pubblica = useApiMutation({
    mutationFn: () =>
      pubblicaPost({
        testo,
        allegati: allegati.map((a) => a.chiave).filter((c): c is string => Boolean(c)),
      }),
    invalida: [getElencaPostQueryKey()],
    onSuccess: () => {
      setTesto('');
      setAllegati([]);
      setAperto(false);
    },
  });

  const caricamentoInCorso = allegati.some((a) => !a.chiave && !a.errore);
  const puoPubblicare = testo.trim().length > 0 && !caricamentoInCorso && !pubblica.isPending;

  const scegliFile = async (file: File) => {
    const tipo = tipoAllegatoDa(file.type);
    const id = `allegato-${(prossimoId.current += 1)}`;

    if (!tipo) {
      setAllegati((correnti) => [
        ...correnti,
        { id, nome: file.name, avanzamento: 0, errore: t('tipoNonAmmesso') },
      ]);
      return;
    }

    setAllegati((correnti) => [...correnti, { id, nome: file.name, avanzamento: 0 }]);

    try {
      const richiesta: PreautorizzaAllegatoDto = {
        nome: file.name,
        tipo,
        dimensione: file.size,
      };
      const { data } = await preautorizzaAllegato(richiesta);
      await caricaConAvanzamento({
        url: data.url,
        corpo: file,
        // Il tipo lo dichiara il browser: è più preciso del generico che
        // l'archivio si aspetterebbe (`image/*` non è un tipo mandabile).
        intestazioni: { 'content-type': file.type },
        onAvanzamento: (percentuale) => aggiorna(id, { avanzamento: percentuale }),
      });
      aggiorna(id, { chiave: data.chiave, avanzamento: 100 });
    } catch {
      // Il messaggio del server arriva già tradotto dall'avviso automatico:
      // qui resta la riga in errore, che dice *quale* file non è passato.
      aggiorna(id, { errore: t('caricamentoFallito') });
    }
  };

  const aggiorna = (id: string, modifiche: Partial<AllegatoInCorso>) =>
    setAllegati((correnti) =>
      correnti.map((a) => (a.id === id ? { ...a, ...modifiche } : a)),
    );

  return (
    <Card padding="nessuno" className="p-4">
      <div className="flex items-center gap-3">
        <Avatar nome={UTENTE.nome} dimensione={40} />

        {aperto ? (
          <textarea
            autoFocus
            rows={3}
            value={testo}
            maxLength={LUNGHEZZA_MASSIMA_POST}
            onChange={(evento) => setTesto(evento.target.value)}
            placeholder={t('composer', { nome })}
            className="flex-1 resize-none rounded-[14px] border-2 border-bordo bg-superficie px-4 py-3 text-[14.5px] outline-none focus:border-primary-500"
          />
        ) : (
          <button
            type="button"
            onClick={() => setAperto(true)}
            className="flex h-11 flex-1 items-center rounded-[14px] bg-superficie-alt-2 px-4 text-left text-[14.5px] text-testo-debole"
          >
            {t('composer', { nome })}
          </button>
        )}

        {!aperto ? (
          <div className="flex flex-none items-center gap-1.5">
            <AzioneAllegato
              icona="carica"
              etichetta={t('apri')}
              onPress={() => selettore.current?.click()}
            />
            <Button className="h-[38px] px-4 text-[13.5px]" onPress={() => setAperto(true)}>
              {t('pubblica')}
            </Button>
          </div>
        ) : null}
      </div>

      {allegati.length ? (
        <ul className="mt-3 flex flex-col gap-2">
          {allegati.map((allegato) => (
            <li key={allegato.id}>
              <RigaAllegato allegato={allegato} onTogli={() => togli(setAllegati, allegato.id)} />
            </li>
          ))}
        </ul>
      ) : null}

      {aperto ? (
        <div className="mt-3 flex items-center gap-2">
          <AzioneAllegato
            icona="carica"
            etichetta={t('apri')}
            onPress={() => selettore.current?.click()}
          />
          <span className="text-xs text-testo-debole">
            {testo.length}/{LUNGHEZZA_MASSIMA_POST}
          </span>
          <Button
            className="ml-auto h-[38px] px-4 text-[13.5px]"
            isDisabled={!puoPubblicare}
            inCaricamento={pubblica.isPending}
            onPress={() => pubblica.mutate(undefined)}
          >
            {t('pubblica')}
          </Button>
        </div>
      ) : null}

      <input
        ref={selettore}
        type="file"
        accept="application/pdf,image/*,text/*"
        className="hidden"
        onChange={(evento) => {
          const file = evento.target.files?.[0];
          if (file) void scegliFile(file);
          // Si azzera per poter riscegliere lo stesso file dopo un errore.
          evento.target.value = '';
        }}
      />
    </Card>
  );
}

const togli = (
  imposta: (aggiorna: (correnti: AllegatoInCorso[]) => AllegatoInCorso[]) => void,
  id: string,
) => imposta((correnti) => correnti.filter((a) => a.id !== id));

/** Una riga per file: nome, avanzamento, e come toglierlo. */
function RigaAllegato({
  allegato,
  onTogli,
}: {
  allegato: AllegatoInCorso;
  onTogli: () => void;
}) {
  const completo = Boolean(allegato.chiave);

  return (
    <div className="flex items-center gap-3 rounded-[14px] border border-bordo bg-superficie-alt px-3 py-2.5">
      <Icona nome={allegato.errore ? 'chiudi' : 'carica'} dimensione={16} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-bold text-testo">{allegato.nome}</span>
        {allegato.errore ? (
          <span className="block text-xs text-errore">{allegato.errore}</span>
        ) : (
          <span
            aria-hidden
            className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-superficie-alt-2"
          >
            <span
              style={{ width: `${allegato.avanzamento}%` }}
              className={cn(
                'block h-full rounded-full transition-[width] duration-200',
                completo ? 'bg-primary-500' : 'bg-primary-300',
              )}
            />
          </span>
        )}
      </span>
      <button type="button" onClick={onTogli} className="flex-none text-testo-debole">
        <Icona nome="chiudi" dimensione={16} />
      </button>
    </div>
  );
}

function AzioneAllegato({
  icona,
  etichetta,
  onPress,
}: {
  icona: 'carica' | 'cartella';
  etichetta: string;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      aria-label={etichetta}
      className="grid size-[38px] place-items-center rounded-xl text-testo-tenue transition-colors hover:bg-superficie-alt-2"
    >
      <Icona nome={icona} dimensione={18} />
    </button>
  );
}
