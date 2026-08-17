import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { rotte } from '@/content';
import { riscuotiDestinazione } from '@/lib/destinazione-in-attesa';
import { useTema } from '@/theme';
import { apriSessione, avvisatore } from '@prome/app-core';
import {
  richiediCodiceAccesso,
  verificaCodiceAccesso,
  type RichiestaCodiceDto,
  type VerificaCodiceDto,
  type VerificaCodiceAccesso200,
} from '@prome/api-client';
import { useApiMutation, useT } from '@/hooks';
import { CampoCodice } from '@/components/app/campo-codice';
import { Icona, Intestazione, Screen, Text } from '@/components/ui';

/**
 * Verifica del codice via email.
 *
 * L'email arriva dalla schermata precedente e viene ripetuta qui: è l'unico
 * modo per accorgersi di averla scritta male prima di aspettare un messaggio
 * che non arriverà.
 *
 * La verifica parte da sola appena le sei cifre sono complete: chiedere un
 * tocco in più su un codice già inserito è lavoro inutile. Se il codice è
 * sbagliato, scaduto o esaurito, **il campo si svuota** e si può riprovare
 * subito — lasciarlo pieno con le caselle nello stato «compilato» farebbe
 * sembrare che il problema sia altrove.
 */
export default function SchermataCodice() {
  const tema = useTema();
  const t = useT();
  const { email } = useLocalSearchParams<{ email?: string }>();

  /**
   * Cambia a ogni tentativo fallito e rimonta il campo, che è il modo di
   * azzerarlo senza dargli una seconda memoria da tenere allineata.
   */
  const [tentativo, setTentativo] = useState(0);

  // Senza indirizzo non c'è nulla da verificare: capita solo arrivando qui
  // con un collegamento diretto, e mandare `email: ''` produrrebbe un errore
  // di validazione che non si può attaccare ad alcun campo visibile.
  useEffect(() => {
    if (!email) router.replace(rotte.accedi());
  }, [email]);

  const verifica = useApiMutation<VerificaCodiceAccesso200, VerificaCodiceDto>({
    mutationFn: (dati: VerificaCodiceDto) => verificaCodiceAccesso(dati),
    onSuccess: async ({ data }) => {
      await apriSessione(data.token);
      // Chi non ha ancora compilato il profilo non entra nella bacheca: da
      // qui sappiamo già quale delle due strade prendere. Chi invece stava
      // andando da qualche parte — un invito aperto da un collegamento — ci
      // torna, e la destinazione **non si riscuote** se il profilo manca
      // ancora: la riprende `completa-profilo`, che è l'ultimo passo.
      const attesa = data.onboardingCompletato ? riscuotiDestinazione() : null;
      router.replace(attesa ?? (data.onboardingCompletato ? rotte.bacheca() : rotte.profilo()));
      // Rientrare entro la grazia di 14 giorni annulla la cancellazione: va
      // detto, o l'utente non saprà mai che l'account è salvo.
      const riattivato = data.cancellazioneAnnullata === true;
      if (riattivato) avvisatore().info(t('app.accesso.riattivato'));
    },
    // Il messaggio lo mostra già l'avviso, tradotto dal server: qui resta solo
    // da rimettere la schermata in condizione di riprovare.
    onError: () => setTentativo((precedente) => precedente + 1),
  });

  const rinvio = useApiMutation<unknown, RichiestaCodiceDto>({
    mutationFn: (dati: RichiestaCodiceDto) => richiediCodiceAccesso(dati),
    onSuccess: () => setTentativo((precedente) => precedente + 1),
  });

  if (!email) return null;

  return (
    <>
      <Intestazione conIndietro />
      <Screen scorrevole conAreaSicura={false}>
        <View style={{ gap: tema.spaziatura[2] }}>
          <Text variante="titoloGrande" style={{ fontSize: 30 }}>
            {t('app.accesso.codiceTitolo')}
          </Text>
          <Text variante="corpoTenue">{t('app.accesso.codiceSommario', { email })}</Text>
        </View>

        <CampoCodice
          key={tentativo}
          onCompletato={(codice) => verifica.mutate({ email, codice })}
        />

        {verifica.isPending ? (
          // Fra la sesta cifra e la risposta passa un istante in cui non
          // succede niente di visibile: senza questa riga sembra che il tocco
          // non sia stato registrato, e si ridigita.
          <Text variante="didascalia" colore="primario">
            {t('comune.invioInCorso')}
          </Text>
        ) : null}

        <View
          style={{
            flexDirection: 'row',
            gap: tema.spaziatura[3],
            backgroundColor: tema.colori.superficieAlt,
            borderRadius: tema.raggio.xl,
            padding: tema.spaziatura[4],
          }}
        >
          <Icona nome="posta" />
          <Text variante="didascalia" style={{ flex: 1 }}>
            {t('app.accesso.codiceAiuto')}
          </Text>
        </View>

        <View style={{ gap: tema.spaziatura[2] }}>
          <Text variante="didascalia">{t('app.accesso.nonArrivato')}</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text variante="didascalia" colore="primario" onPress={() => router.back()}>
              {t('app.accesso.cambiaEmail')}
            </Text>
            {/* Due dei messaggi d'errore dicono «chiedine uno nuovo»: se
                questo non facesse nulla, sarebbero un vicolo cieco. */}
            <Text
              variante="didascalia"
              colore="primario"
              onPress={() => {
                if (!rinvio.isPending) rinvio.mutate({ email });
              }}
            >
              {rinvio.isPending ? t('comune.invioInCorso') : t('app.accesso.reinvia')}
            </Text>
          </View>
        </View>
      </Screen>
    </>
  );
}
