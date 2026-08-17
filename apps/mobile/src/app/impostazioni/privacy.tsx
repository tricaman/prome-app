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
import { QueryBoundary } from '@/components/feedback';
import {
  Card,
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
 * **I due assi sono indipendenti** e si cambiano uno alla volta, come li
 * modella il dominio. «Chi può contattarti» era spento e dichiarato tale
 * finché nessuna regola lo leggeva; ora decide chi può invitarti quando ti
 * vede in una sala aperta senza condividere con te nessuno spazio — l'unico
 * gesto in cui il rifiuto non racconta a nessuno se sei iscritto a Prome.
 */
export default function SchermataPrivacy() {
  const tema = useTema();
  const t = useT();
  const queryClient = useQueryClient();
  const profilo = useLeggiMioProfilo();
  const blocchi = useElencaBlocchi({ limit: 1 });

  const salvaContatto = useApiMutation({
    mutationFn: (contattabilita: AggiornaPrivacyDtoVisibilita) =>
      aggiornaMiaPrivacy({ contattabilita }),
    invalida: [getLeggiMioProfiloQueryKey() as never],
  });

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

      <Screen scorrevole conAreaSicura={false}>
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

        {/* **Adesso vale qualcosa, quindi adesso si sceglie.** Era spenta con
            la pastiglia «Presto» perché nessuna regola la leggeva, e un
            interruttore che non protegge da niente è peggio di uno che manca.
            Da oggi decide chi può invitarti quando ti vede in una sala aperta
            senza condividere con te nessuno spazio — l'unico gesto in cui il
            rifiuto non racconta a nessuno se sei iscritto a Prome. */}
        <TitoloSezione>{t('app.impostazioni.contattabilita.titolo')}</TitoloSezione>
        <QueryBoundary query={profilo}>
          {({ data }) => (
            <Card style={{ gap: tema.spaziatura[3] }}>
              <Text variante="didascalia">{t('app.impostazioni.contattabilita.testo')}</Text>
              {/* Dove vale davvero: una regola di privacy che non dice il
                  proprio perimetro si legge più larga di quello che è. */}
              <Text variante="didascalia" colore="debole">
                {t('app.impostazioni.contattabilita.ambito')}
              </Text>
              <SceltaRadio
                opzioni={opzioni('contattabilita')}
                valore={data.impostazioniPrivacy.contattabilita}
                etichetta={t('app.impostazioni.contattabilita.titolo')}
                inCorso={salvaContatto.isPending}
                conPallino
                onScegli={(contattabilita) => salvaContatto.mutate(contattabilita)}
              />
            </Card>
          )}
        </QueryBoundary>

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
