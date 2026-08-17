import { Linking, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import {
  useElencaAuleStudio,
  useElencaMaterialiSalvati,
  useElencaMieiGruppi,
  useElencaPost,
  useLeggiMioProfilo,
} from '@prome/api-client';
import { paginaDelSito, rotte } from '@/content';
import { useTema } from '@/theme';
import { useT } from '@/hooks';
import { useI18n } from '@/i18n/i18n-provider';
import { QueryBoundary } from '@/components/feedback';
import { VersioneApp } from '@/components/app/versione-app';
import { SchermataTab } from '@/components/app/schermata-tab';
import {
  Avatar,
  Button,
  Card,
  Elenco,
  Icona,
  RigaElenco,
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
 * con tre contatori costanti scritti nel file. **Adesso i tre numeri sono
 * veri**, e vengono dalla paginazione delle tre letture che il server sa già
 * fare: i miei gruppi, le mie aule e — da oggi — i miei post, che sono la
 * bacheca con `soloMiei=true`. Si chiede una riga sola per ciascuno: serve il
 * totale, non l'elenco. Il trattino resta per il tempo in cui il numero non è
 * ancora arrivato, perché un numero che non c'è non è zero.
 *
 * Non si contano nemmeno passando dall'esportazione dei dati: quello è
 * l'adempimento GDPR, e usarlo per decorare tre riquadri sarebbe un abuso di
 * un endpoint che esiste per un'altra ragione.
 *
 * «Modifica profilo» e «Impostazioni» sono **due destinazioni distinte**, non
 * due nomi della stessa: la prima cambia chi sei, la seconda come funziona
 * l'app, e per questo la prima è la chiamata piena della scheda e la seconda
 * è una riga dell'elenco più sotto.
 *
 * In alto **non c'è più nessuna icona**: era una seconda porta per la stessa
 * stanza, e per giunta il suo segno somigliava a un interruttore del tema —
 * che il tema si cambia dalle impostazioni, dove la voce esiste già.
 *
 * I documenti legali stanno nel piè di pagina perché è la convenzione che chi
 * usa un'app conosce, e perché la revisione degli store vuole la policy
 * raggiungibile da dentro. Solo la privacy è nativa; gli altri due aprono il
 * sito, che è dove vivono e dove cambiano senza che l'app si aggiorni.
 *
 * **Non c'è niente da condividere, e non ci sarà.** Il disegno metteva un
 * bottone di condivisione accanto a «Modifica profilo»: manderebbe a una
 * pagina pubblica del profilo, che non esiste e non è in ritardo — i dati
 * delle persone su Prome sono privati, e «Pubblico» significa aperto agli
 * studenti iscritti, mai al web.
 *
 * Non resta alcun segnaposto in questa scheda: l'anno di corso non si mostra
 * affatto, perché inventarlo sarebbe la stessa classe di difetto di «Marta
 * Rossi».
 */
export default function SchedaProfilo() {
  const tema = useTema();
  const t = useT();
  const { lingua } = useI18n();
  const profilo = useLeggiMioProfilo();
  // Una riga sola: serve il totale, non l'elenco. Vale per tutti e tre —
  // il numero sta nella paginazione, e chiedere venti righe per leggerlo
  // sarebbe venti righe scaricate per niente.
  const gruppi = useElencaMieiGruppi({ limit: 1 });
  const mieiPost = useElencaPost({ limit: 1, soloMiei: true });
  const mieAule = useElencaAuleStudio({ limit: 1 });
  const salvati = useElencaMaterialiSalvati({ limit: 1 });

  const totaleGruppi = gruppi.data?.meta.pagination.total;
  const totalePost = mieiPost.data?.meta.pagination.total;
  const totaleAule = mieAule.data?.meta.pagination.total;
  const totaleSalvati = salvati.data?.meta.pagination.total;

  const apriSulSito = (percorso: string) => () => {
    void Linking.openURL(paginaDelSito(percorso, lingua));
  };

  return (
    /* Le due letture si aggiornano insieme al trascinamento, ma il confine di
       query resta **dentro**, attorno alla sola scheda dell'identità: se il
       profilo non si legge, impostazioni e uscita devono restare raggiungibili
       — è il momento in cui servono di più. */
    <SchermataTab
      titolo={t('app.nav.profilo')}
      query={profilo}
      ancheQuery={[gruppi]}
    >
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
                <Avatar nome={nome || '?'} foto={data.foto} dimensione={64} />
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
              </View>
            </Card>
          );
        }}
      </QueryBoundary>

      <View style={{ flexDirection: 'row', gap: tema.spaziatura[2] }}>
        <Contatore
          etichetta={t('app.profilo.contatori.post')}
          valore={totalePost === undefined ? IGNOTO : String(totalePost)}
        />
        <Contatore
          etichetta={t('app.profilo.contatori.aule')}
          valore={totaleAule === undefined ? IGNOTO : String(totaleAule)}
        />
        <Contatore
          etichetta={t('app.profilo.contatori.gruppi')}
          valore={totaleGruppi === undefined ? IGNOTO : String(totaleGruppi)}
        />
      </View>

      <TitoloSezione>{t('app.profilo.attivita')}</TitoloSezione>
      <Elenco>
        <RigaElenco
          icona="bacheca"
          tinta="menta"
          etichetta={t('app.profilo.tuoiPost')}
          valore={totalePost === undefined ? undefined : String(totalePost)}
          onPress={() => router.push(rotte.mieiPost())}
        />
        <RigaElenco
          icona="aule"
          tinta="ambra"
          etichetta={t('app.profilo.tueAule')}
          valore={totaleAule === undefined ? undefined : String(totaleAule)}
          onPress={() => router.push(rotte.mieAule())}
        />
        <RigaElenco
          icona="cartella"
          tinta="blu"
          etichetta={t('app.nav.materiali')}
          valore={totaleSalvati === undefined ? undefined : String(totaleSalvati)}
          onPress={() => router.push(rotte.materialiSalvati())}
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
          onPress={() => router.push(rotte.aiuto())}
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
    </SchermataTab>
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
