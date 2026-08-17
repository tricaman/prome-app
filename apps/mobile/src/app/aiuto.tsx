import { useState } from 'react';
import { Platform, View } from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import {
  chiediAiuto,
  RichiestaDiSupportoDtoCategoria,
  type RichiestaDiSupportoDtoCategoria as Categoria,
} from '@prome/api-client';
import { LUNGHEZZA_MASSIMA_RICHIESTA_SUPPORTO } from '@prome/contracts';
import { useTema } from '@/theme';
import { useApiMutation, useT } from '@/hooks';
import { Button, Input, Intestazione, SceltaRadio, Screen, Text } from '@/components/ui';

/** L'ordine in cui si presentano: dal caso più frequente al meno. */
const CATEGORIE: Categoria[] = [
  RichiestaDiSupportoDtoCategoria.BUG,
  RichiestaDiSupportoDtoCategoria.ACCOUNT,
  RichiestaDiSupportoDtoCategoria.CONTENUTO,
  RichiestaDiSupportoDtoCategoria.SUGGERIMENTO,
  RichiestaDiSupportoDtoCategoria.DOMANDA,
  RichiestaDiSupportoDtoCategoria.ALTRO,
];

/**
 * «Scrivici».
 *
 * Un modulo, non un indirizzo email: da un telefono aprire il client di posta
 * significa uscire dall'app, e chi sta segnalando un difetto perde per strada
 * proprio le informazioni che servono a riprodurlo.
 *
 * **La categoria viene da un elenco chiuso** e non è burocrazia: è ciò che
 * rende la coda smistabile: a testo libero, in poche settimane, la stessa cosa
 * arriva scritta in sei modi. «Un contenuto o una persona» dice per esteso che
 * la via più rapida è «Segnala» sul contenuto — non lo nasconde e non lo
 * vieta, perché chi arriva qui ha già cercato altrove.
 *
 * **Le informazioni tecniche si vedono prima di partire**, scritte per esteso
 * nella riga sotto al modulo: sono le uniche cose che il modulo aggiunge da
 * sé, e allegarle di nascosto — anche se innocue — è il modo di far scoprire
 * dopo ciò che si poteva dire prima.
 *
 * Non c'è un elenco delle richieste già mandate, e non è una mancanza: il
 * server non le conserva. L'email al supporto è il ticket, e una tabella di
 * richieste sarebbe un detentore di dati personali in più — con dentro ciò che
 * una persona ha scritto — in cambio di una coda che il supporto ha già nella
 * propria casella.
 */
export default function SchermataAiuto() {
  const tema = useTema();
  const t = useT();

  const [categoria, setCategoria] = useState<Categoria>(RichiestaDiSupportoDtoCategoria.BUG);
  const [testo, setTesto] = useState('');
  const [contatto, setContatto] = useState('');

  // Versione e apparecchio, letti a runtime: scriverli a mano vorrebbe dire
  // spedire un numero vecchio dal primo rilascio.
  const contesto = [
    `Prome ${Constants.expoConfig?.version ?? '?'}`,
    `${Platform.OS} ${String(Platform.Version)}`,
  ].join(' · ');

  const invia = useApiMutation({
    mutationFn: () =>
      chiediAiuto({
        categoria,
        testo: testo.trim(),
        contatto: contatto.trim() || undefined,
        contesto,
      }),
    // Niente da invalidare: non esiste una lettura di ciò che si è mandato.
    invalida: [],
    // L'avviso di esito arriva dall'API già tradotto; qui si torna indietro,
    // perché restare su un modulo appena svuotato somiglia a un invio fallito.
    onSuccess: () => router.back(),
  });

  const puoInviare = testo.trim().length > 0;

  return (
    <>
      <Intestazione conIndietro titolo={t('app.aiuto.titolo')} />

      <Screen scorrevole conAreaSicura={false}>
        <Text variante="corpoTenue">{t('app.aiuto.sommario')}</Text>

        <SceltaRadio
          etichetta={t('app.aiuto.categoria')}
          valore={categoria}
          conPallino
          opzioni={CATEGORIE.map((valore) => ({
            valore,
            etichetta: t(`app.aiuto.categorie.${valore}`),
            descrizione: t(`app.aiuto.categorieSub.${valore}`),
          }))}
          onScegli={setCategoria}
        />

        <Input
          etichetta={t('app.aiuto.messaggio')}
          aiuto={t('app.aiuto.messaggioAiuto')}
          value={testo}
          onChangeText={setTesto}
          righe={6}
          massimoCaratteri={LUNGHEZZA_MASSIMA_RICHIESTA_SUPPORTO}
        />

        <Input
          etichetta={t('app.aiuto.contatto')}
          aiuto={t('app.aiuto.contattoAiuto')}
          value={contatto}
          onChangeText={setContatto}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <View style={{ gap: 2 }}>
          <Text variante="didascalia">{t('app.aiuto.contesto', { contesto })}</Text>
          <Text variante="didascalia">{t('app.aiuto.contestoPerche')}</Text>
        </View>

        <Button
          titolo={t('app.aiuto.invia')}
          larghezzaPiena
          disabled={!puoInviare}
          inCaricamento={invia.isPending}
          onPress={() => invia.mutate(undefined)}
          style={{ marginTop: tema.spaziatura[2] }}
        />
      </Screen>
    </>
  );
}
