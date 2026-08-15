import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { chiudiSessione } from '@prome/app-core';
import { richiediCancellazioneAccount } from '@prome/api-client';
import { useTema } from '@/theme';
import { useApiMutation, useT } from '@/hooks';
import { Button, Card, Icona, Input, Intestazione, Screen, Text } from '@/components/ui';

/**
 * Eliminazione dell'account.
 *
 * Deve stare nell'app perché la revisione degli store lo richiede: se un
 * account si crea qui, qui si deve poter chiudere, senza scrivere a nessuno.
 *
 * Il testo usa le stesse parole della privacy policy — contenuti anonimizzati,
 * dati cancellati entro 30 giorni, riattivazione entro 14 — perché se la
 * schermata e il documento legale si contraddicono, quello che resta è la
 * sfiducia.
 *
 * La parola da digitare rende l'atto deliberato, non un tocco; la rete di
 * sicurezza vera è la grazia: rientrare entro 14 giorni annulla la richiesta.
 */
export default function SchermataEliminaAccount() {
  const tema = useTema();
  const t = useT();
  const queryClient = useQueryClient();
  const [conferma, setConferma] = useState('');

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

      <Screen scorrevole>
        <Card style={{ gap: tema.spaziatura[3], borderColor: tema.colori.errore }}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: tema.raggio.lg,
              backgroundColor: tema.colori.erroreTenue,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icona nome="cestino" dimensione={26} colore="errore" />
          </View>

          <Text variante="sottotitolo">{t('app.impostazioni.elimina.titolo')}</Text>
          <Text variante="corpoTenue">{t('app.impostazioni.elimina.testo')}</Text>
        </Card>

        <View style={{ gap: tema.spaziatura[3] }}>
          <Text variante="etichetta">
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
        </View>

        <Button
          titolo={t('app.impostazioni.elimina.azione')}
          variante="distruttiva"
          larghezzaPiena
          disabled={!puoEliminare}
          inCaricamento={elimina.isPending}
          onPress={() => elimina.mutate(undefined)}
        />
      </Screen>
    </>
  );
}
