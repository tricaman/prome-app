import { useEffect, useRef, useState } from 'react';
import { Linking, Pressable, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as SelettoreFile from 'expo-document-picker';
import { caricaConAvanzamento, pesoLeggibile, tipoAllegatoDa } from '@prome/app-core';
import { LUNGHEZZA_MASSIMA_MESSAGGIO } from '@prome/contracts';
import {
  concediPermesso,
  condividiMaterialeAula,
  creaArgomento,
  eliminaArgomento,
  eliminaMaterialeAula,
  getApriSalaAulaStudioQueryKey,
  invitaInAulaStudio,
  preautorizzaMaterialeAula,
  getElencaAuleStudioQueryKey,
  promuoviAModeratore,
  retrocediDaModeratore,
  revocaPermesso,
  rimuoviPartecipante,
  useApriSalaAulaStudio,
  useLeggiMioProfilo,
  type MaterialeDto,
  type PartecipanteDto,
  type SalaDto,
} from '@prome/api-client';
import { rotte } from '@/content';
import { useTema } from '@/theme';
import { useApiMutation, useChatAula, useT } from '@/hooks';
import { QueryBoundary } from '@/components/feedback';
import {
  Avatar,
  Button,
  Card,
  Chip,
  Icona,
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
            {scheda === 'materiali' ? (
              <Materiali aulaId={id} sala={data} puoCaricare={data.mieiPermessi.caricare} />
            ) : null}
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

/**
 * I materiali, raggruppati per argomento; gli sciolti in fondo.
 *
 * **Si scrivono, non solo si leggono**: prima da qui si poteva soltanto
 * guardare l'elenco, e caricare la foto degli appunti — il gesto più naturale
 * che si faccia da un telefono — richiedeva di aprire il computer.
 *
 * Il caricamento è lo stesso a tre tempi del composer dei post, con lo stesso
 * `expo-document-picker` e la stessa funzione condivisa: si dichiarano nome,
 * tipo e dimensione, i byte vanno **diritti all'archivio** senza passare dagli
 * endpoint di dominio, e solo alla fine si cita la chiave. Su React Native il
 * corpo è il riferimento al file locale, così i byte non finiscono in memoria.
 */
function Materiali({
  aulaId,
  sala,
  puoCaricare,
}: {
  aulaId: string;
  sala: SalaDto;
  puoCaricare: boolean;
}) {
  const tema = useTema();
  const t = useT();
  const io = useLeggiMioProfilo();
  const chiaveSala = getApriSalaAulaStudioQueryKey(aulaId);

  const [nuovoArgomento, setNuovoArgomento] = useState('');
  const [inCaricamento, setInCaricamento] = useState(false);

  const aggiungiArgomento = useApiMutation({
    mutationFn: (titolo: string) => creaArgomento(aulaId, { titolo }),
    invalida: [chiaveSala as never],
    onSuccess: () => setNuovoArgomento(''),
  });

  const togliArgomento = useApiMutation({
    mutationFn: (argomentoId: string) => eliminaArgomento(aulaId, argomentoId),
    invalida: [chiaveSala as never],
  });

  const togliFile = useApiMutation({
    mutationFn: (materialeId: string) => eliminaMaterialeAula(aulaId, materialeId),
    invalida: [chiaveSala as never],
  });

  const condividi = useApiMutation({
    mutationFn: (chiave: string) => condividiMaterialeAula(aulaId, { chiave }),
    invalida: [chiaveSala as never],
  });

  /**
   * Sceglie un file e lo porta nell'aula.
   *
   * Il tipo lo si verifica **prima** di chiedere la pre-autorizzazione: un
   * rifiuto locale è immediato e non consuma una chiave che resterebbe
   * prenotata a vuoto.
   */
  const scegliFile = async () => {
    const esito = await SelettoreFile.getDocumentAsync({
      type: ['application/pdf', 'image/*', 'text/*'],
      copyToCacheDirectory: true,
    });
    if (esito.canceled) return;

    const scelto = esito.assets[0];
    if (!scelto) return;

    const tipo = tipoAllegatoDa(scelto.mimeType);
    if (!tipo) return;

    setInCaricamento(true);
    try {
      const { data } = await preautorizzaMaterialeAula(aulaId, {
        nome: scelto.name,
        tipo,
        dimensione: scelto.size ?? 0,
      });
      await caricaConAvanzamento({
        url: data.url,
        // Il riferimento al file locale, non i byte: li legge il livello
        // nativo mentre invia.
        corpo: {
          uri: scelto.uri,
          name: scelto.name,
          type: scelto.mimeType ?? 'application/octet-stream',
        },
        intestazioni: { 'content-type': scelto.mimeType ?? 'application/octet-stream' },
      });
      condividi.mutate(data.chiave);
    } finally {
      setInCaricamento(false);
    }
  };

  const gruppi = sala.argomenti.map((argomento) => ({
    id: argomento.id,
    titolo: argomento.titolo,
    file: sala.allegati.filter((file) => file.argomentoId === argomento.id),
  }));
  const sciolti = sala.allegati.filter((file) => !file.argomentoId);
  if (sciolti.length) {
    gruppi.push({ id: 'sciolti', titolo: t('app.sala.senzaArgomento'), file: sciolti });
  }

  return (
    <Screen scorrevole>
      {puoCaricare ? (
        <Button
          titolo={t('app.sala.caricaMateriale')}
          variante="contorno"
          larghezzaPiena
          iconaSinistra={<Icona nome="carica" dimensione={18} />}
          inCaricamento={inCaricamento || condividi.isPending}
          onPress={() => void scegliFile()}
        />
      ) : null}

      {sala.sonoModeratore ? (
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: tema.spaziatura[2] }}>
          <View style={{ flex: 1 }}>
            <Input
              etichetta={t('app.sala.nuovoArgomento')}
              value={nuovoArgomento}
              onChangeText={setNuovoArgomento}
            />
          </View>
          <Button
            titolo={t('comune.salva')}
            variante="contorno"
            disabled={!nuovoArgomento.trim()}
            inCaricamento={aggiungiArgomento.isPending}
            onPress={() => aggiungiArgomento.mutate(nuovoArgomento.trim())}
          />
        </View>
      ) : null}

      {sala.allegati.length === 0 && sala.argomenti.length === 0 ? (
        <Text variante="corpoTenue">{t('app.sala.nessunMateriale')}</Text>
      ) : null}

      {gruppi.map((gruppo) => (
        <View key={gruppo.id} style={{ gap: tema.spaziatura[3] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: tema.spaziatura[2] }}>
            <Text variante="etichetta" style={{ flex: 1 }}>
              {gruppo.titolo}
            </Text>
            {/* Eliminare un argomento non cancella alcun file: i materiali
                tornano sciolti, ed è l'opposto di ciò che accade ai post. */}
            {sala.sonoModeratore && gruppo.id !== 'sciolti' ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('app.sala.eliminaArgomento')}
                hitSlop={10}
                onPress={() => togliArgomento.mutate(gruppo.id)}
              >
                <Icona nome="cestino" dimensione={17} colore="debole" />
              </Pressable>
            ) : null}
          </View>

          <Card style={{ padding: 0, overflow: 'hidden' }}>
            {gruppo.file.map((file, indice) => (
              <RigaMateriale
                key={file.id}
                file={file}
                ultima={indice === gruppo.file.length - 1}
                puoEliminare={sala.sonoModeratore || file.caricatoDa === io.data?.data.utenteId}
                onElimina={() => togliFile.mutate(file.id)}
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

function RigaMateriale({
  file,
  ultima,
  puoEliminare,
  onElimina,
}: {
  file: MaterialeDto;
  ultima: boolean;
  puoEliminare: boolean;
  onElimina: () => void;
}) {
  const tema = useTema();
  const t = useT();

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
      {/* Il file si apre: portava un indirizzo e non era toccabile. */}
      <Pressable
        accessibilityRole="button"
        style={{ flex: 1, minWidth: 0 }}
        onPress={() => void Linking.openURL(file.url)}
      >
        <Text variante="etichetta" numberOfLines={1}>
          {file.nome}
        </Text>
        <Text variante="didascalia">{pesoLeggibile(file.dimensione)}</Text>
      </Pressable>

      {puoEliminare ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('app.sala.impostazioni.eliminaMateriale')}
          hitSlop={10}
          onPress={onElimina}
        >
          <Icona nome="cestino" dimensione={17} colore="debole" />
        </Pressable>
      ) : null}
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
  const io = useLeggiMioProfilo();

  /**
   * Uscire dall'aula.
   *
   * Era l'unica operazione mancante che riguardasse ogni partecipante e non
   * chi amministra: si entrava in un'aula pubblica dal telefono e non se ne
   * usciva più. L'ultimo moderatore lo ferma il server (AS2), con il messaggio
   * che dice cosa fare.
   */
  const esci = useApiMutation({
    mutationFn: (utenteId: string) => rimuoviPartecipante(aulaId, utenteId),
    invalida: [getElencaAuleStudioQueryKey() as never],
    onSuccess: () => router.replace(rotte.auleStudio()),
  });

  const chiaveSala = getApriSalaAulaStudioQueryKey(aulaId);

  const promuovi = useApiMutation({
    mutationFn: (utenteId: string) => promuoviAModeratore(aulaId, utenteId),
    invalida: [chiaveSala as never],
  });

  const retrocedi = useApiMutation({
    mutationFn: (utenteId: string) => retrocediDaModeratore(aulaId, utenteId),
    invalida: [chiaveSala as never],
  });

  const rimuovi = useApiMutation({
    mutationFn: (utenteId: string) => rimuoviPartecipante(aulaId, utenteId),
    invalida: [chiaveSala as never],
  });

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
      {sala.sonoModeratore ? <Invito aulaId={aulaId} /> : null}

      {sala.partecipanti.map((partecipante) => (
        <RigaPartecipante
          key={partecipante.utenteId}
          partecipante={partecipante}
          puoModerare={sala.sonoModeratore}
          sonoIo={partecipante.utenteId === io.data?.data.utenteId}
          onCambia={(permesso, concedi) =>
            cambia.mutate({ utenteId: partecipante.utenteId, permesso, concedi })
          }
          onPromuovi={() => promuovi.mutate(partecipante.utenteId)}
          onRetrocedi={() => retrocedi.mutate(partecipante.utenteId)}
          onRimuovi={() => rimuovi.mutate(partecipante.utenteId)}
        />
      ))}
      <Text variante="didascalia" style={{ marginTop: tema.spaziatura[2] }}>
        {t('app.sala.tuoiPermessiTesto')}
      </Text>

      {io.data ? (
        <Card style={{ gap: tema.spaziatura[2], marginTop: tema.spaziatura[3] }}>
          <Text variante="etichetta">{t('app.sala.impostazioni.esci')}</Text>
          <Text variante="didascalia">{t('app.sala.impostazioni.esciAiuto')}</Text>
          <Button
            titolo={t('app.sala.impostazioni.esci')}
            variante="contorno"
            larghezzaPiena
            inCaricamento={esci.isPending}
            onPress={() => esci.mutate(io.data!.data.utenteId)}
          />
        </Card>
      ) : null}
    </Screen>
  );
}

/**
 * Invitare qualcuno per email.
 *
 * Il destinatario è un indirizzo, non un utente: si invita anche chi non è
 * ancora iscritto, e l'invito lo aspetta sette giorni. Dal telefono non si
 * poteva invitare affatto — si poteva solo entrare dove qualcun altro ti
 * aveva già chiamato.
 */
function Invito({ aulaId }: { aulaId: string }) {
  const tema = useTema();
  const t = useT();
  const [destinatario, setDestinatario] = useState('');

  const invita = useApiMutation({
    mutationFn: () => invitaInAulaStudio(aulaId, { destinatario: destinatario.trim() }),
    onSuccess: () => setDestinatario(''),
  });

  return (
    <Card style={{ gap: tema.spaziatura[3] }}>
      <View style={{ gap: 4 }}>
        <Text variante="etichetta">{t('app.sala.invita')}</Text>
        <Text variante="didascalia">{t('app.sala.invitaAiuto')}</Text>
      </View>

      <Input
        etichetta={t('app.sala.indirizzo')}
        placeholder="compagno@studenti.unibo.it"
        value={destinatario}
        onChangeText={setDestinatario}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
      />

      <Button
        titolo={t('app.sala.invia')}
        variante="contorno"
        larghezzaPiena
        disabled={!destinatario.includes('@')}
        inCaricamento={invita.isPending}
        onPress={() => invita.mutate(undefined)}
      />
    </Card>
  );
}

function RigaPartecipante({
  partecipante,
  puoModerare,
  sonoIo,
  onCambia,
  onPromuovi,
  onRetrocedi,
  onRimuovi,
}: {
  partecipante: PartecipanteDto;
  puoModerare: boolean;
  sonoIo: boolean;
  onCambia: (permesso: NomePermesso, concedi: boolean) => void;
  onPromuovi: () => void;
  onRetrocedi: () => void;
  onRimuovi: () => void;
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

      {/* Le tre azioni di moderazione, che sul telefono non c'erano affatto:
          si poteva concedere un permesso ma non promuovere, non retrocedere e
          non rimuovere nessuno. Le regole non si duplicano qui — l'ultimo
          moderatore lo ferma il server (AS2), con il messaggio che dice cosa
          fare. Su sé stessi non compaiono: uscire è un gesto a parte, in fondo
          alla scheda. */}
      {puoModerare && !sonoIo ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tema.spaziatura[2] }}>
          <Button
            titolo={
              partecipante.moderatore
                ? t('app.sala.impostazioni.retrocedi')
                : t('app.sala.promuovi')
            }
            variante="contorno"
            dimensione="md"
            onPress={partecipante.moderatore ? onRetrocedi : onPromuovi}
          />
          <Button
            titolo={t('app.sala.rimuovi')}
            variante="fantasma"
            dimensione="md"
            onPress={onRimuovi}
          />
        </View>
      ) : null}
    </Card>
  );
}

const leggibile = (visibilita: string) =>
  visibilita.charAt(0) + visibilita.slice(1).toLowerCase();
