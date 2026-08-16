import { View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import {
  aggiornaPreferenzeNotifiche,
  getLeggiPreferenzeNotificheQueryKey,
  useLeggiPreferenzeNotifiche,
  type AggiornaPreferenzeDto,
  type LeggiPreferenzeNotifiche200,
} from '@prome/api-client';
import { useTema } from '@/theme';
import { useApiMutation, useT } from '@/hooks';
import { SEGNAPOSTO_PAUSA_NOTTURNA, SEGNAPOSTO_PROMEMORIA } from '@/lib/segnaposto';
import { QueryBoundary } from '@/components/feedback';
import {
  Card,
  Elenco,
  Intestazione,
  RigaElenco,
  Screen,
  Switch,
  Text,
  TitoloSezione,
} from '@/components/ui';

const ASSI = ['commenti', 'inviti'] as const;

/**
 * Quando ti avvisiamo.
 *
 * Tolta dall'indice e messa per conto suo: due interruttori e una fascia
 * oraria non appartengono alla stessa schermata di privacy e account.
 *
 * **La scheda in cima non dice che le notifiche sono attive, perché non lo
 * sono.** Sul telefono manca il modulo nativo che registri il dispositivo e a
 * monte manca il fornitore che recapiti: una riga verde con la spunta sarebbe
 * falsa due volte. Dice invece cosa succede davvero — la scelta si salva, il
 * server la rispetta, la consegna non c'è ancora — che è la stessa cosa che il
 * web dichiara con le stesse parole. Una scheda che dichiara il proprio stato
 * non è una promessa falsa; una che lo nasconde sì.
 *
 * I due assi sono indipendenti e si mandano **uno per volta**: il gesto manda
 * solo quello toccato, quindi l'altro non può essere azzerato da una risposta
 * lenta. Nessuno stato locale: a schermo c'è quello che il server ha
 * confermato, e se la scrittura fallisce l'interruttore torna dov'era.
 *
 * SEGNAPOSTO: promemoria e pausa notturna — il contratto delle preferenze ha
 * due assi soli, e nessuna fascia oraria esiste nel modello. Il permesso di
 * sistema non compare affatto (`SEGNAPOSTO_PERMESSO_PUSH`): non c'è un
 * permesso da chiedere, quindi non c'è nemmeno il ramo «negato».
 */
export default function SchermataNotifiche() {
  const tema = useTema();
  const t = useT();
  const queryClient = useQueryClient();
  const preferenze = useLeggiPreferenzeNotifiche();

  const salva = useApiMutation({
    mutationFn: (cambio: AggiornaPreferenzeDto) => aggiornaPreferenzeNotifiche(cambio),
    onSuccess: (risposta) => {
      queryClient.setQueryData<LeggiPreferenzeNotifiche200>(
        getLeggiPreferenzeNotificheQueryKey(),
        risposta,
      );
    },
  });

  return (
    <>
      <Intestazione conIndietro titolo={t('app.impostazioni.notifiche.titolo')} />

      <Screen scorrevole>
        <Card
          style={{
            backgroundColor: tema.tinte.ambra.velo,
            borderColor: tema.tinte.ambra.bordo,
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
                color: tema.tinte.ambra.testo,
              }}
            >
              !
            </Text>
          </View>
          <Text variante="didascalia" style={{ flex: 1, color: tema.tinte.ambra.testo }}>
            {t('app.impostazioni.notifiche.stato')}
          </Text>
        </Card>

        <TitoloSezione>{t('app.impostazioni.notifiche.cosaTiAvvisa')}</TitoloSezione>
        <QueryBoundary query={preferenze}>
          {({ data }) => (
            <Elenco>
              {ASSI.map((asse) => (
                <RigaElenco
                  key={asse}
                  etichetta={t(`app.impostazioni.notifiche.${asse}.titolo`)}
                  sottotitolo={t(`app.impostazioni.notifiche.${asse}.testo`)}
                  coda={
                    <Switch
                      etichetta={t(`app.impostazioni.notifiche.${asse}.titolo`)}
                      attivo={data[asse]}
                      disabilitato={salva.isPending}
                      onChange={(attivo) => salva.mutate({ [asse]: attivo })}
                    />
                  }
                />
              ))}
              <RigaElenco
                etichetta={t('app.impostazioni.notifiche.promemoria.titolo')}
                sottotitolo={t('app.impostazioni.notifiche.promemoria.testo')}
                presto={SEGNAPOSTO_PROMEMORIA}
              />
            </Elenco>
          )}
        </QueryBoundary>

        <TitoloSezione>{t('app.impostazioni.notifiche.silenzia')}</TitoloSezione>
        <Elenco>
          <RigaElenco
            etichetta={t('app.impostazioni.notifiche.pausaNotturna.titolo')}
            sottotitolo={t('app.impostazioni.notifiche.pausaNotturna.testo')}
            presto={SEGNAPOSTO_PAUSA_NOTTURNA}
          />
        </Elenco>

      </Screen>
    </>
  );
}
