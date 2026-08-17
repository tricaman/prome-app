import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { chiudiSessione } from '@prome/app-core';
import { richiediCancellazioneAccount } from '@prome/api-client';
import { useTema } from '@/theme';
import { useApiMutation, useT } from '@/hooks';
import { Button, Card, Foglio, Input, Intestazione, Screen, Text } from '@/components/ui';

const PUNTI = ['uno', 'due', 'tre'] as const;

/**
 * Eliminazione dell'account.
 *
 * Deve stare nell'app perché la revisione degli store lo richiede: se un
 * account si crea qui, qui si deve poter chiudere, senza scrivere a nessuno.
 * Il requisito è che sia raggiungibile; l'obiettivo nostro è che sia **chiara**.
 *
 * Niente muro rosso, quindi: tre passi numerati che dicono cosa succede al
 * profilo, ai contenuti e ai backup. **L'anonimizzazione va detta per prima e
 * per intero**, perché è la cosa che sorprende: i post restano utili a chi
 * studia ma diventano «Utente rimosso». Le parole sono le stesse della privacy
 * policy — anonimizzazione, 30 giorni, riattivazione entro 14 — perché se la
 * schermata e il documento legale si contraddicono, quello che resta è la
 * sfiducia. I due numeri non sono in contraddizione: la grazia è di 14 giorni,
 * poi la cancellazione esegue, e i backup ruotano ogni 14: trenta è il limite
 * superiore vero.
 *
 * L'alternativa si offre **prima** della conferma, perché spesso il problema è
 * il rumore e non il prodotto — ma sono le tre alternative che esistono
 * davvero: spegnere gli avvisi, restringere chi vede, bloccare qualcuno. La
 * pausa dell'account non c'è, ed era stata tolta proprio perché non era mai
 * stata definita da nessuna parte: rimetterla qui come consiglio sarebbe
 * mandare qualcuno a cercare un bottone che non esiste.
 *
 * **La gerarchia dei bottoni è invertita di proposito**: «Resto su Prome» è
 * pieno, «Elimina il mio account» è un contorno. L'azione distruttiva resta
 * disponibile senza essere attraente.
 *
 * La parola da digitare rende l'atto deliberato, non un tocco; la rete di
 * sicurezza vera resta la grazia.
 */
export default function SchermataEliminaAccount() {
  const tema = useTema();
  const t = useT();
  const queryClient = useQueryClient();
  const [conferma, setConferma] = useState('');
  const [chiedeConferma, setChiedeConferma] = useState(false);

  const parola = t('app.impostazioni.elimina.parola');
  const puoEliminare = conferma.trim().toUpperCase() === parola;

  // L'etichetta è tradotta e la parola dentro va evidenziata: si spezza il
  // messaggio attorno alla parola invece di cablare l'ordine delle lingue.
  const [primaDellaParola, dopoLaParola] = t('app.impostazioni.elimina.scriviPerConfermare', {
    parola,
  }).split(parola);

  const elimina = useApiMutation({
    mutationFn: () => richiediCancellazioneAccount(),
    onSuccess: async () => {
      // Prima si chiude la sessione (l'endpoint ha già revocato tutto lato
      // server), poi si esce dalle schermate private, e SOLO DOPO si svuota
      // la cache: svuotarla prima rimetterebbe in fetch query montate ormai
      // senza token.
      await chiudiSessione();
      router.replace('/');
      queryClient.clear();
    },
  });

  return (
    <>
      <Intestazione conIndietro titolo={t('app.impostazioni.elimina.titolo')} />

      <Screen scorrevole conAreaSicura={false}>
        <View style={{ gap: tema.spaziatura[2] }}>
          <Text variante="titolo" style={{ fontSize: 26 }}>
            {t('app.impostazioni.elimina.introTitolo')}
          </Text>
          <Text variante="corpoTenue">{t('app.impostazioni.elimina.introTesto')}</Text>
        </View>

        <View style={{ gap: tema.spaziatura[3] }}>
          {PUNTI.map((punto, indice) => (
            <View
              key={punto}
              style={{
                flexDirection: 'row',
                gap: tema.spaziatura[3],
                alignItems: 'flex-start',
                backgroundColor: tema.colori.superficieAlt2,
                borderRadius: tema.raggio.xl,
                padding: tema.spaziatura[4],
              }}
            >
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: tema.raggio.md,
                  backgroundColor: tema.tinte.menta.sfondo,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  variante="didascalia"
                  style={{
                    fontWeight: tema.tipografia.peso.extra,
                    color: tema.tinte.menta.testo,
                  }}
                >
                  {indice + 1}
                </Text>
              </View>
              <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                <Text variante="etichetta" style={{ fontSize: 13.5 }}>
                  {t(`app.impostazioni.elimina.punti.${punto}.titolo`)}
                </Text>
                <Text variante="didascalia">
                  {t(`app.impostazioni.elimina.punti.${punto}.testo`)}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <Card
          style={{
            backgroundColor: tema.tinte.menta.velo,
            borderColor: tema.tinte.menta.bordo,
            flexDirection: 'row',
            gap: tema.spaziatura[3],
            alignItems: 'flex-start',
          }}
        >
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: tema.raggio.full,
              backgroundColor: tema.colori.superficie,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              variante="didascalia"
              style={{
                fontSize: 12,
                fontWeight: tema.tipografia.peso.extra,
                color: tema.tinte.menta.testo,
              }}
            >
              ?
            </Text>
          </View>
          <Text variante="didascalia" style={{ flex: 1, color: tema.tinte.menta.testo }}>
            {t('app.impostazioni.elimina.alternativa')}
          </Text>
        </Card>

        <View style={{ gap: tema.spaziatura[3], marginTop: tema.spaziatura[2] }}>
          <Button
            titolo={t('app.impostazioni.elimina.azione')}
            variante="contorno"
            dimensione="lg"
            larghezzaPiena
            onPress={() => setChiedeConferma(true)}
            style={{ borderColor: tema.colori.errore }}
          />
          <Button
            titolo={t('app.impostazioni.elimina.resto')}
            dimensione="lg"
            larghezzaPiena
            onPress={() => router.back()}
          />
        </View>
      </Screen>

      <Foglio
        aperto={chiedeConferma}
        titolo={t('app.impostazioni.elimina.foglio.titolo')}
        onChiudi={() => setChiedeConferma(false)}
      >
        <Text variante="corpoTenue">
          {primaDellaParola}
          <Text colore="errore">{parola}</Text>
          {dopoLaParola}
        </Text>
        <Input
          value={conferma}
          onChangeText={setConferma}
          placeholder={parola}
          autoCapitalize="characters"
          autoCorrect={false}
        />
        <Button
          titolo={t('app.impostazioni.elimina.foglio.azione')}
          variante="distruttiva"
          dimensione="lg"
          larghezzaPiena
          disabled={!puoEliminare}
          inCaricamento={elimina.isPending}
          onPress={() => elimina.mutate(undefined)}
        />
        <Button
          titolo={t('comune.annulla')}
          variante="fantasma"
          larghezzaPiena
          onPress={() => setChiedeConferma(false)}
        />
      </Foglio>
    </>
  );
}
