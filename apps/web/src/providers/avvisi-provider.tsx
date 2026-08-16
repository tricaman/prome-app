'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { toast, Toaster } from 'sonner';
import { configuraFeedback } from '@prome/app-core';
import { useTema } from './tema';

/**
 * Collega il canale di feedback condiviso alla libreria di avvisi del web.
 *
 * Da qui in poi ogni chiamata API può mostrare l'esito da sola: la pagina
 * scrive la mutazione e basta. I messaggi predefiniti servono solo quando il
 * server non risponde affatto, quindi sono letti dai cataloghi tradotti.
 */
export function AvvisiProvider({ children }: { children: ReactNode }) {
  const t = useTranslations();
  const { risolto } = useTema();

  // Il riferimento tiene aggiornata la funzione di traduzione senza dover
  // riconfigurare il canale a ogni cambio di lingua.
  const traduci = useRef(t);
  useEffect(() => {
    traduci.current = t;
  }, [t]);

  useEffect(() => {
    configuraFeedback({
      avvisatore: {
        successo: (messaggio, opzioni) =>
          void toast.success(messaggio, { description: opzioni?.descrizione }),
        errore: (messaggio, opzioni) =>
          void toast.error(messaggio, { description: opzioni?.descrizione }),
        info: (messaggio, opzioni) =>
          void toast.info(messaggio, { description: opzioni?.descrizione }),
      },
      messaggioSuccessoPredefinito: () => traduci.current('comune.operazioneCompletata'),
      messaggioErrorePredefinito: () => traduci.current('errori.generico.titolo'),
    });
  }, []);

  return (
    <>
      {children}
      {/*
        Le etichette della regione e del pulsante di chiusura non si vedono ma
        si sentono: senza queste due traduzioni uno screen reader annuncia in
        inglese anche sulle pagine italiane.
      */}
      <Toaster
        position="top-right"
        richColors
        closeButton
        containerAriaLabel={t('comune.avvisi')}
        theme={risolto === 'dark' ? 'dark' : 'light'}
        toastOptions={{
          classNames: { toast: 'rounded-2xl' },
          closeButtonAriaLabel: t('comune.chiudi'),
        }}
      />
    </>
  );
}
