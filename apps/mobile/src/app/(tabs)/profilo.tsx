import { Linking, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { useElencaMieiGruppi, useLeggiMioProfilo } from '@prome/api-client';
import { paginaDelSito, rotte } from '@/content';
import { useTema } from '@/theme';
import { useT } from '@/hooks';
import { useI18n } from '@/i18n/i18n-provider';
import {
  SEGNAPOSTO_AIUTO,
  SEGNAPOSTO_AULE_CREATE,
  SEGNAPOSTO_CONDIVIDI_PROFILO,
  SEGNAPOSTO_MATERIALI_SALVATI,
  SEGNAPOSTO_POST_MIEI,
  gestoSospeso,
} from '@/lib/segnaposto';
import { QueryBoundary } from '@/components/feedback';
import { VersioneApp } from '@/components/app/versione-app';
import {
  Avatar,
  AzioneTonda,
  Button,
  Card,
  Elenco,
  Icona,
  Intestazione,
  RigaElenco,
  Screen,
  Text,
  TitoloSezione,
} from '@/components/ui';

/** Un numero che non c'è non è zero: è un numero che non sappiamo. */
const IGNOTO = '—';

/**
 * Il proprio profilo: un punto di partenza, non un vicolo cieco.
 *
 * Fino a ieri questa tab era una scheda e un bottone «Impostazioni», con due
 * terzi di schermo vuoti, e prima ancora un'identità inventata («Marta Rossi»)
 * con tre contatori costanti scritti nel file. I contatori sono tornati come
 * **forma**, non come bugia: l'unico numero vero è quello dei gruppi, che il
 * server sa contare perché «i miei gruppi» è già una domanda che sa
 * rispondere. Post e aule mostrano un trattino e la loro riga è spenta, perché
 * per contarli servirebbe un filtro per autore che gli elenchi non hanno.
 *
 * Non si contano nemmeno passando dall'esportazione dei dati: quello è
 * l'adempimento GDPR, e usarlo per decorare tre riquadri sarebbe un abuso di
 * un endpoint che esiste per un'altra ragione.
 *
 * «Modifica profilo» e «Impostazioni» sono **due destinazioni distinte**, non
 * due nomi della stessa: la prima cambia chi sei, la seconda come funziona
 * l'app, e per questo la prima è la chiamata piena della scheda e la seconda
 * ha l'ingranaggio in alto più una riga sua più sotto.
 *
 * I documenti legali stanno nel piè di pagina perché è la convenzione che chi
 * usa un'app conosce, e perché la revisione degli store vuole la policy
 * raggiungibile da dentro. Solo la privacy è nativa; gli altri due aprono il
 * sito, che è dove vivono e dove cambiano senza che l'app si aggiorni.
 *
 * SEGNAPOSTO: i tuoi post, le aule create, i materiali salvati, la
 * condivisione del profilo e «Aiuto e contatti». Nessuno dei cinque ha un
 * endpoint dietro; l'anno di corso non si scrive affatto, perché inventarlo
 * sarebbe la stessa classe di difetto di «Marta Rossi».
 */
export default function SchedaProfilo() {
  const tema = useTema();
  const t = useT();
  const { lingua } = useI18n();
  const profilo = useLeggiMioProfilo();
  // Una riga sola: serve il totale, non l'elenco.
  const gruppi = useElencaMieiGruppi({ limit: 1 });

  const totaleGruppi = gruppi.data?.meta.pagination.total;

  const apriSulSito = (percorso: string) => () => {
    void Linking.openURL(paginaDelSito(percorso, lingua));
  };

  return (
    <>
      <Intestazione
        titolo={t('app.nav.profilo')}
        azioni={
          <AzioneTonda
            icona="impostazioni"
            etichetta={t('app.impostazioni.titolo')}
            onPress={() => router.push(rotte.impostazioni())}
          />
        }
      />

      <Screen scorrevole>
        <QueryBoundary query={profilo}>
          {({ data }) => {
            const nome = [data.nome, data.cognome].filter(Boolean).join(' ');

            return (
              <Card style={{ gap: tema.spaziatura[4] }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: tema.spaziatura[4],
                  }}
                >
                  <Avatar nome={nome || '?'} dimensione={64} />
                  <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                    <Text variante="sottotitolo" style={{ fontSize: 20 }} numberOfLines={1}>
                      {nome || t('app.impostazioni.senzaNome')}
                    </Text>
                    {data.corso?.nome ? (
                      <Text
                        variante="didascalia"
                        numberOfLines={1}
                        style={{ fontWeight: tema.tipografia.peso.semi }}
                      >
                        {data.corso.nome}
                      </Text>
                    ) : null}
                    {data.universita?.nome ? (
                      <Text variante="didascalia" numberOfLines={1}>
                        {data.universita.nome}
                      </Text>
                    ) : null}
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: tema.spaziatura[2] }}>
                  <Button
                    titolo={t('app.profilo.modifica')}
                    larghezzaPiena
                    style={{ flex: 1 }}
                    iconaSinistra={
                      <Icona nome="matita" dimensione={17} colore="primarioTesto" />
                    }
                    onPress={() => router.push(rotte.modificaProfilo())}
                  />
                  {/* Non esiste un profilo di terzi da aprire: mandare un
                      collegamento vorrebbe dire mandare a una pagina che non
                      c'è. Il bottone resta nel disegno, spento. */}
                  <AzioneTonda
                    icona="condividi"
                    etichetta={t('app.profilo.condividi')}
                    disabilitato
                    onPress={gestoSospeso(SEGNAPOSTO_CONDIVIDI_PROFILO)}
                  />
                </View>
              </Card>
            );
          }}
        </QueryBoundary>

        <View style={{ flexDirection: 'row', gap: tema.spaziatura[2] }}>
          <Contatore etichetta={t('app.profilo.contatori.post')} valore={IGNOTO} />
          <Contatore etichetta={t('app.profilo.contatori.aule')} valore={IGNOTO} />
          <Contatore
            etichetta={t('app.profilo.contatori.gruppi')}
            valore={totaleGruppi === undefined ? IGNOTO : String(totaleGruppi)}
          />
        </View>

        {/* Il disegno prevede, per un profilo appena nato, un invito al primo
            post al posto delle righe. Non c'è: per sapere che non ha ancora
            scritto niente servirebbe un conteggio dei suoi post, che è
            esattamente la cosa che manca — e dedurlo dai gruppi direbbe «non
            hai ancora pubblicato niente» a chi ha quaranta post e nessun
            gruppo. Torna con il primo endpoint che conta per autore. */}
        <TitoloSezione>{t('app.profilo.attivita')}</TitoloSezione>
        <Elenco>
          <RigaElenco
            icona="bacheca"
            tinta="menta"
            etichetta={t('app.profilo.tuoiPost')}
            presto={SEGNAPOSTO_POST_MIEI}
          />
          <RigaElenco
            icona="aule"
            tinta="ambra"
            etichetta={t('app.profilo.auleCreate')}
            presto={SEGNAPOSTO_AULE_CREATE}
          />
          <RigaElenco
            icona="cartella"
            tinta="blu"
            etichetta={t('app.nav.materiali')}
            presto={SEGNAPOSTO_MATERIALI_SALVATI}
          />
          <RigaElenco
            icona="gruppi"
            etichetta={t('app.nav.tuoiGruppi')}
            valore={totaleGruppi === undefined ? undefined : String(totaleGruppi)}
            onPress={() => router.push(rotte.gruppi())}
          />
        </Elenco>

        <TitoloSezione>{t('app.profilo.impostazioniSupporto')}</TitoloSezione>
        <Elenco>
          <RigaElenco
            icona="impostazioni"
            etichetta={t('app.impostazioni.titolo')}
            sottotitolo={t('app.profilo.impostazioniSub')}
            onPress={() => router.push(rotte.impostazioni())}
          />
          <RigaElenco
            icona="aiuto"
            etichetta={t('app.profilo.aiuto.titolo')}
            sottotitolo={t('app.profilo.aiuto.testo')}
            presto={SEGNAPOSTO_AIUTO}
          />
        </Elenco>

        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'center',
            alignItems: 'center',
            gap: tema.spaziatura[2],
            marginTop: tema.spaziatura[2],
          }}
        >
          <Legale etichetta={t('app.privacy.titolo')} onPress={() => router.push(rotte.privacyPolicy())} />
          <Separatore />
          <Legale etichetta={t('app.profilo.piede.termini')} onPress={apriSulSito('/termini')} />
          <Separatore />
          <Legale
            etichetta={t('app.profilo.piede.lineeGuida')}
            onPress={apriSulSito('/linee-guida')}
          />
        </View>
        <VersioneApp />
      </Screen>
    </>
  );
}

function Contatore({ etichetta, valore }: { etichetta: string; valore: string }) {
  const tema = useTema();

  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        gap: 2,
        backgroundColor: tema.colori.superficie,
        borderRadius: tema.raggio.lg,
        borderWidth: 1,
        borderColor: tema.colori.bordo,
        paddingVertical: tema.spaziatura[3],
      }}
    >
      <Text variante="sottotitolo" style={{ fontSize: 21 }}>
        {valore}
      </Text>
      <Text
        variante="didascalia"
        allineamento="center"
        numberOfLines={1}
        style={{ fontSize: 11, fontWeight: tema.tipografia.peso.grassetto }}
      >
        {etichetta}
      </Text>
    </View>
  );
}

function Legale({ etichetta, onPress }: { etichetta: string; onPress: () => void }) {
  const tema = useTema();

  return (
    <Pressable accessibilityRole="link" onPress={onPress} hitSlop={8}>
      <Text
        variante="didascalia"
        style={{ fontSize: 12, fontWeight: tema.tipografia.peso.grassetto }}
      >
        {etichetta}
      </Text>
    </Pressable>
  );
}

function Separatore() {
  return (
    <Text variante="didascalia" colore="debole">
      ·
    </Text>
  );
}
