'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSessione } from '@prome/app-core';
import { usePathname, useRouter } from '@/i18n/navigazione';
import { PARAMETRO_DESTINAZIONE, percorsiApp } from '@/lib/percorsi-app';
import { LoadingState } from '@/components/feedback';

/**
 * Il muro dell'area privata.
 *
 * Finché non c'è, ogni schermata sotto `/app` si disegna anche senza sessione:
 * la colonna di navigazione, l'avatar, il nome. Nessuna di quelle cose è un
 * dato dell'utente — sono segnaposto — ma chi le guarda vede un'app in cui è
 * entrato, e ci crede. È esattamente il difetto che porta a dire «ho pulito il
 * browser e mi teneva loggato»: non era la sessione a sopravvivere, era la
 * schermata a non averla mai guardata.
 *
 * Tre stati, non due. «Non lo sappiamo ancora» è un'attesa, non un rifiuto:
 * l'archivio si legge dopo il primo disegno, e rimandare all'accesso in quel
 * momento butterebbe fuori a ogni ricarica chi è regolarmente dentro.
 */
export function RichiedeSessione({ children }: { children: ReactNode }) {
  const { autenticato, caricata } = useSessione();
  const router = useRouter();
  const percorso = usePathname();
  const queryClient = useQueryClient();
  /** Se la sessione c'era: serve a riconoscere l'istante in cui cade. */
  const eraDentro = useRef(false);

  useEffect(() => {
    if (!caricata) return;
    if (autenticato) {
      eraDentro.current = true;
      return;
    }

    // La cache si svuota **qui**, e non dove si preme «esci», perché una
    // sessione può cadere in molti modi — il bottone, una revoca da un altro
    // dispositivo, una scadenza — e questo è il punto che li vede tutti. Se
    // restasse, chi entra dopo su questo computer troverebbe in bacheca i post
    // di chi c'era prima, senza che nessuna richiesta sia mai partita.
    if (eraDentro.current) {
      eraDentro.current = false;
      queryClient.clear();
    }

    // Da dove si è stati rimandati indietro viaggia nell'indirizzo: chi apre
    // un collegamento a un post e scopre di essere scaduto deve ritrovarsi
    // quel post dopo il codice, non la bacheca.
    router.replace(
      `${percorsiApp.accedi()}?${PARAMETRO_DESTINAZIONE}=${encodeURIComponent(percorso)}`,
    );
  }, [caricata, autenticato, percorso, router, queryClient]);

  // Anche mentre il router naviga: un istante di schermata privata è comunque
  // una schermata privata mostrata a chi non è entrato.
  if (!autenticato) return <LoadingState dimensione="piena" />;
  return <>{children}</>;
}

/**
 * L'opposto: la schermata di accesso non ha senso per chi è già dentro.
 *
 * Non è solo un'inezia di comodità. Chi arriva su `/app/accedi` con una
 * sessione viva e chiede un codice ne riceve uno vero, e un codice mandato per
 * sbaglio è un codice che qualcuno può intercettare senza motivo.
 */
export function SoloSenzaSessione({
  destinazione,
  children,
}: {
  /** Già convalidata da `destinazioneDopoAccesso`: qui non si controlla nulla. */
  destinazione: string;
  children: ReactNode;
}) {
  const { autenticato, caricata } = useSessione();
  const router = useRouter();

  /**
   * Se questa pagina ha già visto, almeno una volta, che non c'era sessione.
   *
   * Distingue i due modi di essere autenticati qui, che vanno trattati in modo
   * opposto: chi **arriva** con una sessione viva va rimandato indietro, chi la
   * **ottiene qui** no. La sessione nasce su questa stessa pagina, e un istante
   * dopo il codice verificato questa guardia e il modulo di accesso vorrebbero
   * navigare tutti e due — vincerebbe l'ultimo, mandando sulla bacheca chi il
   * profilo non l'ha ancora compilato. Chi è appena entrato sa dove deve
   * andare: quella decisione resta del modulo.
   */
  const eraFuori = useRef(false);

  useEffect(() => {
    if (!caricata) return;
    if (!autenticato) {
      eraFuori.current = true;
      return;
    }
    if (eraFuori.current) return;
    router.replace(destinazione);
  }, [caricata, autenticato, destinazione, router]);

  return <>{children}</>;
}
