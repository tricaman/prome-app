import { View } from 'react-native';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  aggiornaMiaPrivacy,
  getLeggiMioProfiloQueryKey,
  useElencaBlocchi,
  useLeggiMioProfilo,
  type AggiornaPrivacyDtoVisibilita,
  type LeggiMioProfilo200,
} from '@prome/api-client';
import { rotte } from '@/content';
import { useTema } from '@/theme';
import { useApiMutation, useT } from '@/hooks';
import { SEGNAPOSTO_CONTATTABILITA, gestoSospeso } from '@/lib/segnaposto';
import { QueryBoundary } from '@/components/feedback';
import {
  Card,
  Chip,
  Elenco,
  Intestazione,
  RigaElenco,
  SceltaRadio,
  Screen,
  Text,
  TitoloSezione,
  type OpzioneRadio,
} from '@/components/ui';

const VALORI = ['PRIVATO', 'ATENEO', 'PUBBLICO'] as const;
const CHIAVI = { PRIVATO: 'privato', ATENEO: 'ateneo', PUBBLICO: 'pubblico' } as const;

/**
 * Privacy.
 *
 * Le due privacy del modello restano due sezioni distinte, ognuna con la sua
 * spiegazione: il dominio ha rifiutato esplicitamente l'idea di un «livello di
 * privacy» unico, e riassumerle in un aggettivo solo — profilo aperto, profilo
 * chiuso — sarebbe rimetterla dentro dall'interfaccia.
 *
 * Su una schermata sua diventano card con descrizione invece dei tre bottoni
 * stretti di prima: fra Privato, Ateneo e Pubblico la differenza ha
 * conseguenze troppo concrete per stare in una parola.
 *
 * **L'ordine è invertito rispetto al disegno**: prima quello che funziona,
 * poi quello che non è ancora applicato. Aprire una schermata con una sezione
 * spenta è la peggiore prima impressione che possa fare, e l'ordine giusto qui
 * è quello di frequenza d'uso.
 *
 * Ogni scelta si applica subito, senza un bottone Salva, e in cache va **la
 * risposta del server**, mai una previsione: chi legge «Pubblico» crede di
 * essere visibile, e su una decisione di privacy un valore a schermo che non è
 * stato salvato è la bugia peggiore possibile — questa schermata l'ha già
 * detta una volta, mostrando «Ateneo» a chiunque mentre il valore vero era
 * «Privato».
 *
 * SEGNAPOSTO: chi può contattarti — l'API accetta e salva l'asse, ma nessuna
 * regola lo legge (`SEGNAPOSTO_CONTATTABILITA`). Le card ci sono e sono
 * spente, con lo stato scritto sopra: salvarlo farebbe credere protetta una
 * persona che non lo è.
 */
export default function SchermataPrivacy() {
  const tema = useTema();
  const t = useT();
  const queryClient = useQueryClient();
  const profilo = useLeggiMioProfilo();
  const blocchi = useElencaBlocchi({ limit: 1 });

  const salva = useApiMutation({
    mutationFn: (visibilita: AggiornaPrivacyDtoVisibilita) => aggiornaMiaPrivacy({ visibilita }),
    onSuccess: (risposta) => {
      queryClient.setQueryData<LeggiMioProfilo200>(getLeggiMioProfiloQueryKey(), risposta);
    },
    invalida: [getLeggiMioProfiloQueryKey() as never],
  });

  const opzioni = (gruppo: 'contenuti' | 'contattabilita'): OpzioneRadio<
    AggiornaPrivacyDtoVisibilita
  >[] =>
    VALORI.map((valore) => ({
      valore,
      etichetta: t(`app.impostazioni.visibilita.${CHIAVI[valore]}`),
      descrizione: t(`app.impostazioni.${gruppo}.${CHIAVI[valore]}`),
    }));

  return (
    <>
      <Intestazione conIndietro titolo={t('app.impostazioni.privacy')} />

      <Screen scorrevole>
        <TitoloSezione>{t('app.impostazioni.contenuti.titolo')}</TitoloSezione>
        <QueryBoundary query={profilo}>
          {({ data }) => (
            <Card style={{ gap: tema.spaziatura[3] }}>
              <Text variante="didascalia">{t('app.impostazioni.contenuti.testo')}</Text>
              <SceltaRadio
                opzioni={opzioni('contenuti')}
                valore={data.impostazioniPrivacy.visibilita}
                etichetta={t('app.impostazioni.contenuti.titolo')}
                inCorso={salva.isPending}
                conPallino
                onScegli={(visibilita) => salva.mutate(visibilita)}
              />
            </Card>
          )}
        </QueryBoundary>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: tema.spaziatura[2],
            marginTop: tema.spaziatura[2],
          }}
        >
          <TitoloSezione>{t('app.impostazioni.contattabilita.titolo')}</TitoloSezione>
          <Chip tono="ambra">{t('comune.presto')}</Chip>
        </View>
        <Card style={{ gap: tema.spaziatura[3] }}>
          <Text variante="didascalia">{t('app.impostazioni.contattabilita.testo')}</Text>
          <Text variante="didascalia" style={{ color: tema.tinte.ambra.testo }}>
            {t('app.impostazioni.contattabilita.nonApplicata')}
          </Text>
          <SceltaRadio
            opzioni={opzioni('contattabilita')}
            valore="PRIVATO"
            etichetta={t('app.impostazioni.contattabilita.titolo')}
            disabilitato
            conPallino
            onScegli={gestoSospeso(SEGNAPOSTO_CONTATTABILITA)}
          />
        </Card>

        <TitoloSezione>{t('app.impostazioni.persone')}</TitoloSezione>
        <Elenco>
          <RigaElenco
            icona="gruppi"
            etichetta={t('app.impostazioni.bloccati.titolo')}
            valore={
              blocchi.data ? String(blocchi.data.meta.pagination.total) : undefined
            }
            onPress={() => router.push(rotte.utentiBloccati())}
          />
        </Elenco>

        {/* La pagina legale si raggiunge dal punto in cui si sta già pensando
            ai propri dati, non solo da un elenco di collegamenti. */}
        <Elenco>
          <RigaElenco
            icona="documento"
            etichetta={t('app.impostazioni.leggiPrivacy.titolo')}
            sottotitolo={t('app.impostazioni.leggiPrivacy.testo')}
            onPress={() => router.push(rotte.privacyPolicy())}
          />
        </Elenco>
      </Screen>
    </>
  );
}
