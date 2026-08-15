import { useEffect, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { pesoLeggibile } from '@prome/app-core';
import { LUNGHEZZA_MASSIMA_MESSAGGIO } from '@prome/contracts';
import {
  concediPermesso,
  getApriSalaAulaStudioQueryKey,
  revocaPermesso,
  useApriSalaAulaStudio,
  type MaterialeDto,
  type PartecipanteDto,
  type SalaDto,
} from '@prome/api-client';
import { useTema } from '@/theme';
import { useApiMutation, useChatAula, useT } from '@/hooks';
import { QueryBoundary } from '@/components/feedback';
import {
  Avatar,
  Button,
  Card,
  Chip,
  Input,
  Intestazione,
  Screen,
  Segmented,
  Switch,
  Text,
} from '@/components/ui';

type Scheda = 'chat' | 'materiali' | 'partecipanti';

/** I tre permessi, nell'ordine in cui il dominio li nomina. */
const PERMESSI = ['parlare', 'scrivere', 'caricare'] as const;
type NomePermesso = (typeof PERMESSI)[number];

/**
 * Dentro un'aula studio.
 *
 * Tutto arriva in **una sola risposta composta** — partecipanti con i loro
 * permessi, argomenti, materiali — e i permessi **li dichiara il server**: la
 * copia locale della regola che viveva qui è sparita, perché due copie della
 * stessa regola sono una di troppo, e quella nel telefono è aggirabile.
 */
export default function SchermataAula() {
  const tema = useTema();
  const t = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [scheda, setScheda] = useState<Scheda>('chat');
  const sala = useApriSalaAulaStudio(id);

  return (
    <View style={{ flex: 1, backgroundColor: tema.colori.sfondo }}>
      <Intestazione conIndietro />

      <QueryBoundary query={sala}>
        {({ data }) => (
          <>
            <View style={{ paddingHorizontal: tema.spaziatura[5], gap: tema.spaziatura[3] }}>
              <View style={{ gap: tema.spaziatura[2] }}>
                <Text variante="titolo">{data.aula.titolo}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tema.spaziatura[2] }}>
                  <Chip>{leggibile(data.aula.visibilita)}</Chip>
                  {data.sonoModeratore ? (
                    <Chip tono="menta">{t('app.sala.ruoli.moderatore')}</Chip>
                  ) : null}
                </View>
                <Text variante="didascalia">
                  {data.aula.partecipanti === 1
                    ? t('app.sala.unPartecipante')
                    : t('app.sala.nPartecipanti', { numero: data.aula.partecipanti })}
                </Text>
              </View>

              <Segmented
                etichetta={data.aula.titolo}
                valore={scheda}
                onChange={setScheda}
                opzioni={[
                  { valore: 'chat', etichetta: t('app.sala.schede.chat') },
                  { valore: 'materiali', etichetta: t('app.nav.materiali') },
                  { valore: 'partecipanti', etichetta: t('app.sala.schede.partecipanti') },
                ]}
              />
            </View>

            {scheda === 'chat' ? (
              <Chat aulaId={id} puoScrivere={data.mieiPermessi.scrivere} />
            ) : null}
            {scheda === 'materiali' ? <Materiali sala={data} /> : null}
            {scheda === 'partecipanti' ? (
              <Partecipanti aulaId={id} sala={data} />
            ) : null}
          </>
        )}
      </QueryBoundary>
    </View>
  );
}

/**
 * La chat: in tempo reale, ma non dipendente dal tempo reale.
 *
 * Lo stato della connessione è visibile perché sul telefono cade più spesso
 * che altrove — si esce dall'app, si perde la rete in metropolitana — e chi
 * scrive deve poter distinguere una linea caduta da una stanza silenziosa.
 */
function Chat({ aulaId, puoScrivere }: { aulaId: string; puoScrivere: boolean }) {
  const tema = useTema();
  const t = useT();
  const { messaggi, stato, inCaricamento, invia } = useChatAula(aulaId);
  const [bozza, setBozza] = useState('');
  const [inInvio, setInInvio] = useState(false);
  const scorrimento = useRef<ScrollView>(null);

  useEffect(() => {
    scorrimento.current?.scrollToEnd({ animated: true });
  }, [messaggi.length]);

  const manda = async () => {
    const testo = bozza.trim();
    if (!testo || inInvio) return;
    setInInvio(true);
    try {
      await invia(testo);
      setBozza('');
    } finally {
      setInInvio(false);
    }
  };

  return (
    <>
      <ScrollView
        ref={scorrimento}
        contentContainerStyle={{ padding: tema.spaziatura[4], gap: tema.spaziatura[3] }}
      >
        {inCaricamento ? <Text variante="corpoTenue">{t('comune.caricamento')}</Text> : null}
        {!inCaricamento && messaggi.length === 0 ? (
          <Text variante="corpoTenue">{t('app.sala.nessunMessaggio')}</Text>
        ) : null}

        {messaggi.map((messaggio) => {
          const nome =
            [messaggio.autore.nome, messaggio.autore.cognome].filter(Boolean).join(' ') ||
            t('comune.utenteRimosso');
          return (
            <View
              key={messaggio.id}
              style={{
                flexDirection: messaggio.mio ? 'row-reverse' : 'row',
                alignItems: 'flex-end',
                gap: tema.spaziatura[2],
              }}
            >
              {!messaggio.mio ? <Avatar nome={nome} dimensione={30} soloColore /> : null}
              <View
                style={{
                  maxWidth: '76%',
                  backgroundColor: messaggio.mio
                    ? tema.colori.primarioTenue
                    : tema.colori.superficie,
                  borderWidth: 1,
                  borderColor: messaggio.mio ? tema.colori.primario : tema.colori.bordo,
                  borderRadius: tema.raggio.lg,
                  paddingHorizontal: tema.spaziatura[3],
                  paddingVertical: tema.spaziatura[3],
                  gap: 3,
                }}
              >
                {!messaggio.mio ? (
                  <Text variante="didascalia" colore="primario" style={{ fontWeight: '800' }}>
                    {nome}
                  </Text>
                ) : null}
                <Text variante="corpo" style={{ fontSize: 14 }}>
                  {messaggio.testo}
                </Text>
                <Text variante="didascalia" style={{ fontSize: 10.5 }}>
                  {new Date(messaggio.inviatoIl).toLocaleTimeString('it-IT', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: tema.colori.bordo,
          backgroundColor: tema.colori.superficie,
          padding: tema.spaziatura[4],
          gap: tema.spaziatura[2],
        }}
      >
        <Text
          variante="didascalia"
          colore={stato === 'connesso' ? undefined : 'errore'}
          style={{ fontSize: 11.5, fontWeight: '700' }}
        >
          {t(`app.sala.connessione.${stato}`)}
        </Text>

        {puoScrivere ? (
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: tema.spaziatura[2] }}>
            <View style={{ flex: 1 }}>
              <Input
                value={bozza}
                onChangeText={setBozza}
                placeholder={t('app.sala.scrivi')}
                massimoCaratteri={LUNGHEZZA_MASSIMA_MESSAGGIO}
                righe={2}
              />
            </View>
            <Button
              titolo={t('app.sala.invia')}
              disabled={!bozza.trim()}
              inCaricamento={inInvio}
              onPress={() => void manda()}
            />
          </View>
        ) : (
          // La sola lettura è uno stato legittimo, non un guasto da spiegare.
          <Text variante="corpoTenue">{t('app.sala.solaLetturaSpiegazione')}</Text>
        )}
      </View>
    </>
  );
}

/** I materiali, raggruppati per argomento; gli sciolti in fondo. */
function Materiali({ sala }: { sala: SalaDto }) {
  const tema = useTema();
  const t = useT();

  const gruppi = sala.argomenti.map((argomento) => ({
    titolo: argomento.titolo,
    file: sala.allegati.filter((file) => file.argomentoId === argomento.id),
  }));
  const sciolti = sala.allegati.filter((file) => !file.argomentoId);
  if (sciolti.length) gruppi.push({ titolo: t('app.sala.senzaArgomento'), file: sciolti });

  return (
    <Screen scorrevole>
      {sala.allegati.length === 0 && sala.argomenti.length === 0 ? (
        <Text variante="corpoTenue">{t('app.sala.nessunMateriale')}</Text>
      ) : null}

      {gruppi.map((gruppo) => (
        <View key={gruppo.titolo} style={{ gap: tema.spaziatura[3] }}>
          <Text variante="etichetta">{gruppo.titolo}</Text>
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            {gruppo.file.map((file, indice) => (
              <RigaMateriale
                key={file.id}
                file={file}
                ultima={indice === gruppo.file.length - 1}
              />
            ))}
            {gruppo.file.length === 0 ? (
              <View style={{ padding: tema.spaziatura[4] }}>
                <Text variante="didascalia">{t('app.sala.argomentoVuoto')}</Text>
              </View>
            ) : null}
          </Card>
        </View>
      ))}
    </Screen>
  );
}

function RigaMateriale({ file, ultima }: { file: MaterialeDto; ultima: boolean }) {
  const tema = useTema();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: tema.spaziatura[3],
        padding: tema.spaziatura[4],
        borderBottomWidth: ultima ? 0 : 1,
        borderBottomColor: tema.colori.superficieAlt2,
      }}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variante="etichetta" numberOfLines={1}>
          {file.nome}
        </Text>
        <Text variante="didascalia">{pesoLeggibile(file.dimensione)}</Text>
      </View>
    </View>
  );
}

/**
 * I partecipanti e i loro permessi.
 *
 * Tre interruttori indipendenti, uno per permesso, perché nel dominio si
 * concedono e si revocano uno alla volta. Sul moderatore restano accesi e
 * bloccati: spiegare la regola è più onesto che nascondere gli interruttori e
 * far sembrare la funzione rotta.
 */
function Partecipanti({ aulaId, sala }: { aulaId: string; sala: SalaDto }) {
  const tema = useTema();
  const t = useT();

  const cambia = useApiMutation({
    mutationFn: ({
      utenteId,
      permesso,
      concedi,
    }: {
      utenteId: string;
      permesso: NomePermesso;
      concedi: boolean;
    }) =>
      concedi
        ? concediPermesso(aulaId, utenteId, permesso)
        : revocaPermesso(aulaId, utenteId, permesso),
    invalida: [getApriSalaAulaStudioQueryKey(aulaId) as never],
  });

  return (
    <Screen scorrevole>
      {sala.partecipanti.map((partecipante) => (
        <RigaPartecipante
          key={partecipante.utenteId}
          partecipante={partecipante}
          puoModerare={sala.sonoModeratore}
          onCambia={(permesso, concedi) =>
            cambia.mutate({ utenteId: partecipante.utenteId, permesso, concedi })
          }
        />
      ))}
      <Text variante="didascalia" style={{ marginTop: tema.spaziatura[2] }}>
        {t('app.sala.tuoiPermessiTesto')}
      </Text>
    </Screen>
  );
}

function RigaPartecipante({
  partecipante,
  puoModerare,
  onCambia,
}: {
  partecipante: PartecipanteDto;
  puoModerare: boolean;
  onCambia: (permesso: NomePermesso, concedi: boolean) => void;
}) {
  const tema = useTema();
  const t = useT();
  const nome =
    [partecipante.nome, partecipante.cognome].filter(Boolean).join(' ') ||
    t('comune.utenteRimosso');

  return (
    <Card style={{ gap: tema.spaziatura[3] }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: tema.spaziatura[3] }}>
        <Avatar nome={nome} dimensione={38} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text variante="etichetta" numberOfLines={1}>
            {nome}
          </Text>
          <Text variante="didascalia">
            {partecipante.moderatore
              ? t('app.sala.ruoli.moderatore')
              : partecipante.solaLettura
                ? t('app.sala.ruoli.solaLettura')
                : t('app.sala.ruoli.partecipante')}
          </Text>
        </View>
      </View>

      {puoModerare
        ? PERMESSI.map((permesso) => (
            <View
              key={permesso}
              style={{ flexDirection: 'row', alignItems: 'center', gap: tema.spaziatura[3] }}
            >
              <Text variante="corpo" style={{ flex: 1, fontSize: 14 }}>
                {t(`app.sala.tabella.${permesso}`)}
              </Text>
              <Switch
                etichetta={`${t(`app.sala.tabella.${permesso}`)} — ${nome}`}
                attivo={partecipante.permessi[permesso]}
                bloccatoAcceso={partecipante.moderatore}
                onChange={(attivo) => onCambia(permesso, attivo)}
              />
            </View>
          ))
        : null}
    </Card>
  );
}

const leggibile = (visibilita: string) =>
  visibilita.charAt(0) + visibilita.slice(1).toLowerCase();
