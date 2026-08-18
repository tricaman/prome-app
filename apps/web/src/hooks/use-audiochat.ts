'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ConnectionState,
  Room,
  RoomEvent,
  createLocalAudioTrack,
  type LocalAudioTrack,
} from 'livekit-client';
import { entraInAudiochat } from '@prome/api-client';
import { statusErrore } from '@prome/app-core';

/**
 * L'audiochat di un'aula, dal lato di chi la usa.
 *
 * **Non si collega mai da sola.** L'audio si accende con un gesto esplicito, e
 * non perché una schermata si è aperta: il microfono di qualcuno non è una
 * risorsa che un'applicazione prende quando le fa comodo. È anche l'unico modo
 * corretto di chiederne il permesso — un browser lo concede solo in risposta a
 * un gesto, e chiederlo al caricamento significa vederselo negare per sempre.
 *
 * **Il microfono si chiede PRIMA di collegarsi, e da solo.** Non è un dettaglio
 * di sequenza: tiene separati due guasti che a chi guarda sembrano lo stesso —
 * «il permesso è negato» e «questa rete non fa passare l'audio» — e che hanno
 * due rimedi diversi. Se si chiedessero insieme, il messaggio sarebbe uno solo
 * e sbagliato per metà delle persone.
 *
 * **Chi parla lo dice il server, sempre.** Mai contare le tracce ricevute: il
 * nodo inoltra solo i parlanti più attivi — misurato, non supposto — quindi
 * l'elenco costruito sulle tracce mostrerebbe meno persone di quante ce ne
 * siano, e diverse da quelle che si sentono.
 */

/** Perché è andata male. Quattro casi, quattro rimedi diversi. */
export type GuastoAudio =
  /** Il browser ha negato il microfono, o un'altra applicazione lo tiene. */
  | 'microfono'
  /** Il server non rilascia l'accesso: manca il permesso di parlare. */
  | 'permesso'
  /** L'audio non è configurato o il nodo è giù. L'aula funziona lo stesso. */
  | 'nonDisponibile'
  /** Ci si è collegati a nulla: quasi sempre è la rete che blocca. */
  | 'rete';

export interface Audiochat {
  stato: 'fuori' | 'collegamento' | 'dentro';
  guasto: GuastoAudio | null;
  /** Nomi di chi sta parlando adesso, dal server. */
  parlanti: ReadonlySet<string>;
  /** Quante persone sono in voce, me compresa. */
  quanti: number;
  /**
   * Sto parlando adesso.
   *
   * Viene dallo stesso evento del server che dice chi parla, non da un
   * misuratore di volume nostro: così il segno che vedo su di me è **lo
   * stesso** che gli altri vedono, e non due verità che si scostano.
   */
  ioParlo: boolean;
  microfonoAcceso: boolean;
  entra: () => Promise<void>;
  esci: () => Promise<void>;
  commutaMicrofono: () => Promise<void>;
}

/**
 * `puoParlare` accende l'**ingresso automatico**, che è ciò che ci si aspetta
 * da una stanza vocale: si atterra e si è dentro, poi semmai ci si muta.
 *
 * Con una condizione che non è una cautela ma il vincolo del work package —
 * «mai attivazione implicita»: si entra da soli **solo se il permesso del
 * microfono è già stato concesso**, cioè solo quando entrare non fa comparire
 * alcuna richiesta. La prima volta il permesso lo si chiede con un gesto, con
 * la motivazione scritta sopra il bottone; dalla seconda in poi si entra da
 * sé, esattamente come in Discord.
 *
 * Dove il browser non sa rispondere alla domanda (Firefox e Safari non
 * espongono lo stato del microfono) si resta al gesto: è la risposta prudente,
 * e in cambio nessuno si trova il microfono aperto senza averlo chiesto.
 */
export function useAudiochat(aulaId: string, puoParlare = false): Audiochat {
  const [stato, setStato] = useState<Audiochat['stato']>('fuori');
  const [guasto, setGuasto] = useState<GuastoAudio | null>(null);
  const [parlanti, setParlanti] = useState<ReadonlySet<string>>(new Set());
  const [quanti, setQuanti] = useState(0);
  const [ioParlo, setIoParlo] = useState(false);
  const [microfonoAcceso, setMicrofonoAcceso] = useState(true);

  const stanza = useRef<Room | null>(null);
  const traccia = useRef<LocalAudioTrack | null>(null);

  const smonta = useCallback(async () => {
    traccia.current?.stop();
    traccia.current = null;
    await stanza.current?.disconnect();
    stanza.current = null;
    setStato('fuori');
    setParlanti(new Set());
    setQuanti(0);
    setIoParlo(false);
    setMicrofonoAcceso(true);
  }, []);

  // Uscendo dalla sala si lascia anche la voce: una connessione audio che
  // sopravvive alla schermata è un microfono aperto che nessuno vede.
  useEffect(() => () => void smonta(), [smonta]);

  const entra = useCallback(async () => {
    setGuasto(null);
    setStato('collegamento');

    // 1. Il microfono, da solo.
    let audio: LocalAudioTrack;
    try {
      audio = await createLocalAudioTrack();
    } catch {
      setStato('fuori');
      setGuasto('microfono');
      return;
    }

    // 2. Il lasciapassare. Il permesso di parlare lo verifica il server: se
    //    dice di no, si spegne il microfono appena acceso — tenerlo aperto
    //    dopo un rifiuto sarebbe la cosa peggiore da fare.
    let accesso: { url: string; lasciapassare: string };
    try {
      const risposta = await entraInAudiochat(aulaId);
      accesso = risposta.data;
    } catch (errore) {
      audio.stop();
      setStato('fuori');
      setGuasto(statusErrore(errore) === 403 ? 'permesso' : 'nonDisponibile');
      return;
    }

    // 3. Il collegamento.
    const room = new Room({ adaptiveStream: true, dynacast: true });
    room
      .on(RoomEvent.TrackSubscribed, (t) => {
        if (t.kind === 'audio') t.attach();
      })
      .on(RoomEvent.ActiveSpeakersChanged, (attivi) => {
        setParlanti(new Set(attivi.map((p) => p.identity)));
        setIoParlo(attivi.some((p) => p.isLocal));
      })
      .on(RoomEvent.ParticipantConnected, () => setQuanti(room.numParticipants + 1))
      .on(RoomEvent.ParticipantDisconnected, () => setQuanti(room.numParticipants + 1))
      .on(RoomEvent.Disconnected, () => void smonta())
      .on(RoomEvent.ConnectionStateChanged, (s) => {
        if (s === ConnectionState.Reconnecting) setStato('collegamento');
        if (s === ConnectionState.Connected) setStato('dentro');
      });

    try {
      await room.connect(accesso.url, accesso.lasciapassare);
      await room.localParticipant.publishTrack(audio);
    } catch {
      audio.stop();
      await room.disconnect().catch(() => undefined);
      setStato('fuori');
      // Il lasciapassare era valido — il server l'ha appena emesso — quindi
      // quasi sempre è la rete a non far passare l'audio.
      setGuasto('rete');
      return;
    }

    stanza.current = room;
    traccia.current = audio;
    setQuanti(room.numParticipants + 1);
    setStato('dentro');
  }, [aulaId, smonta]);

  // Un tentativo solo per visita: chi esce di proposito non deve ritrovarsi
  // dentro un istante dopo, che sarebbe il modo più fastidioso di ignorare un
  // gesto.
  const giaTentato = useRef(false);

  useEffect(() => {
    if (!puoParlare || giaTentato.current) return;
    if (typeof navigator === 'undefined' || !navigator.permissions) return;

    let vivo = true;
    navigator.permissions
      .query({ name: 'microphone' as PermissionName })
      .then((permesso) => {
        if (!vivo || permesso.state !== 'granted' || giaTentato.current) return;
        giaTentato.current = true;
        void entra();
      })
      .catch(() => undefined);

    return () => {
      vivo = false;
    };
  }, [puoParlare, entra]);

  const commutaMicrofono = useCallback(async () => {
    const room = stanza.current;
    if (!room) return;
    const acceso = room.localParticipant.isMicrophoneEnabled;
    await room.localParticipant.setMicrophoneEnabled(!acceso);
    setMicrofonoAcceso(!acceso);
    // Chi si muta smette di parlare all'istante: aspettare l'evento del
    // server lascerebbe il segno acceso per una frazione di secondo dopo il
    // gesto, cioè esattamente quando si vuole essere certi di essere zitti.
    if (acceso) setIoParlo(false);
  }, []);

  return {
    stato,
    guasto,
    parlanti,
    quanti,
    ioParlo,
    microfonoAcceso,
    entra,
    esci: smonta,
    commutaMicrofono,
  };
}
