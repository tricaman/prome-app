import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { danger } from '@prome/design-tokens';
import { useTema } from '@/theme';
import { useT } from '@/hooks';
import { Button, Card, Icona, Input, Intestazione, Screen, Text } from '@/components/ui';

/** Parola da digitare per confermare: rende l'atto deliberato, non un tocco. */
const CONFERMA = 'ELIMINA';

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
 */
export default function SchermataEliminaAccount() {
  const tema = useTema();
  const t = useT();
  const [conferma, setConferma] = useState('');

  const puoEliminare = conferma.trim().toUpperCase() === CONFERMA;

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
            Scrivi <Text colore="errore">{CONFERMA}</Text> per confermare
          </Text>
          <Input
            value={conferma}
            onChangeText={setConferma}
            placeholder={CONFERMA}
            autoCapitalize="characters"
            autoCorrect={false}
          />
        </View>

        <Button
          titolo={t('app.impostazioni.elimina.azione')}
          variante="distruttiva"
          larghezzaPiena
          disabled={!puoEliminare}
          onPress={() => router.replace('/')}
        />

        <Button
          titolo={t('app.impostazioni.elimina.disattiva')}
          variante="fantasma"
          larghezzaPiena
          onPress={() => router.back()}
        />

        <Text variante="didascalia" allineamento="center" style={{ color: danger[600] }}>
          {t('app.impostazioni.elimina.pausa')}
        </Text>
      </Screen>
    </>
  );
}
