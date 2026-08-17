'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import { caricaConAvanzamento } from '@prome/app-core';
import {
  confermaFotoProfilo,
  getLeggiMioProfiloQueryKey,
  preautorizzaFotoProfilo,
  rimuoviFotoProfilo,
} from '@prome/api-client';
import { Avatar, Button, Card, Icona } from '@/components/ui';

/**
 * La foto del profilo, sul web.
 *
 * Gli stessi tre tempi del telefono e degli allegati — si dichiara nome e
 * peso, i byte vanno **diritti all'archivio**, si conferma citando la chiave —
 * con la stessa funzione condivisa: qui il corpo del caricamento è il `File`
 * del browser, là il riferimento al file sul disco, e `XMLHttpRequest` accetta
 * entrambi. È il motivo per cui la funzione è una sola.
 *
 * **Si tocca l'avatar**, come sul telefono: il bottone accanto resta perché su
 * un computer il puntatore non suggerisce che un'immagine sia premibile, ma
 * apre lo stesso selettore. Chi annulla non ha fatto niente di sbagliato — non
 * c'è nulla da dire.
 *
 * La foto si carica **subito** e non aspetta «Salva»: sparire perché si è
 * usciti senza salvare sarebbe l'unica cosa di questa pagina a comportarsi
 * così.
 */
export function FotoProfilo({ nome, foto }: { nome: string; foto: string | null }) {
  const t = useTranslations('app.impostazioni.modificaProfilo');
  const queryClient = useQueryClient();
  const selettore = useRef<HTMLInputElement>(null);
  const [inCorso, setInCorso] = useState(false);

  const rileggiIlProfilo = () =>
    queryClient.invalidateQueries({ queryKey: getLeggiMioProfiloQueryKey() });

  const carica = async (file: File) => {
    setInCorso(true);
    try {
      const { data } = await preautorizzaFotoProfilo({ nome: file.name, dimensione: file.size });
      await caricaConAvanzamento({
        url: data.url,
        corpo: file,
        intestazioni: { 'content-type': file.type },
      });
      await confermaFotoProfilo({ chiave: data.chiave });
      await rileggiIlProfilo();
    } finally {
      setInCorso(false);
    }
  };

  const togli = async () => {
    setInCorso(true);
    try {
      await rimuoviFotoProfilo();
      await rileggiIlProfilo();
    } finally {
      setInCorso(false);
    }
  };

  return (
    <Card padding="md" className="mb-6 flex flex-wrap items-center gap-4">
      <button
        type="button"
        aria-label={t('cambiaFoto')}
        disabled={inCorso}
        onClick={() => selettore.current?.click()}
        className="rounded-full transition-opacity hover:opacity-80 disabled:opacity-60"
      >
        <Avatar nome={nome || '?'} foto={foto} dimensione={64} className="text-xl" />
      </button>

      <div className="min-w-0 flex-1">
        <p className="text-[14.5px] font-extrabold text-testo">{t('foto')}</p>
        <p className="mt-0.5 text-[12.5px] leading-relaxed text-testo-tenue">{t('fotoTesto')}</p>
      </div>

      <div className="flex items-center gap-2.5">
        <Button
          variante="contorno"
          size="sm"
          isDisabled={inCorso}
          onPress={() => selettore.current?.click()}
          iconaSinistra={<Icona nome="fotocamera" dimensione={16} />}
        >
          {t('carica')}
        </Button>
        {foto ? (
          <Button
            variante="fantasma"
            size="sm"
            isDisabled={inCorso}
            onPress={() => void togli()}
            className="text-errore"
          >
            {t('togliFoto')}
          </Button>
        ) : null}
      </div>

      {/* Il selettore vero resta fuori vista: il bottone e l'avatar sono le
          due porte, e un `input type=file` disegnato non somiglia a nessuna
          delle due. */}
      <input
        ref={selettore}
        type="file"
        accept="image/*"
        hidden
        onChange={(evento) => {
          const file = evento.target.files?.[0];
          // Il campo si svuota sempre: senza, scegliere due volte lo stesso
          // file non produrrebbe alcun evento la seconda volta.
          evento.target.value = '';
          if (file) void carica(file);
        }}
      />
    </Card>
  );
}
