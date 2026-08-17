import { useState } from 'react';
import { Linking, Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { caricaConAvanzamento, pesoLeggibile, statusErrore } from '@prome/app-core';
import {
  concediPermesso,
  condividiMaterialeAula,
  creaArgomento,
  eliminaArgomento,
  dimenticaMateriale,
  eliminaMaterialeAula,
  getApriSalaAulaStudioQueryKey,
  getElencaMaterialiSalvatiQueryKey,
  invitaInAulaStudio,
  invitaUtenteInAulaStudio,
  preautorizzaMaterialeAula,
  getElencaAuleStudioQueryKey,
  promuoviAModeratore,
  retrocediDaModeratore,
  revocaPermesso,
  rimuoviPartecipante,
  salvaMateriale,
  useApriSalaAulaStudio,
  useElencaAuleStudio,
  useLeggiMioProfilo,
  type MaterialeDto,
  type PartecipanteDto,
  type SalaDto,
} from '@prome/api-client';
import { rotte } from '@/content';
import { scegliDocumento, scegliFoto, type FileScelto } from '@/lib/scelta-file';
import { useTema } from '@/theme';
import { useApiMutation, useT } from '@/hooks';
import { ErrorState, QueryBoundary, RisorsaNonTrovata } from '@/components/feedback';
import { ChatAula } from '@/components/app/chat-aula';
import {
  Avatar,
  Button,
  Card,
  Chip,
  Elenco,
  Foglio,
  Icona,
  Input,
  Intestazione,
  PulsanteFluttuante,
  RigaElenco,
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
      {/* Il titolo sta nell'intestazione, dove prima c'era solo il tasto
          indietro e una riga di vuoto. Si legge dalla query invece che dai
          dati risolti perché l'intestazione sta fuori dal confine: durante
          l'attesa il tasto indietro deve esserci comunque, ed è la sola cosa
          da fare quando una schermata non si apre. */}
      <Intestazione conIndietro titolo={sala.data?.data.aula.titolo} />

      <QueryBoundary query={sala}
          errore={(errore, riprova) =>
            statusErrore(errore) === 404 ? (
              <RisorsaNonTrovata />
            ) : (
              <ErrorState errore={errore} onRiprova={riprova} />
            )
          }
        >
        {({ data }) => (
          <>
            <View style={{ paddingHorizontal: tema.spaziatura[5], gap: tema.spaziatura[3] }}>
              {/* Contrassegni e presenze su una riga sola: erano tre righe
                  sotto al titolo, e la conversazione cominciava a un terzo di
                  schermo dall'alto. */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: tema.spaziatura[2],
                }}
              >
                <Chip>{leggibile(data.aula.visibilita)}</Chip>
                {data.sonoModeratore ? (
                  <Chip tono="menta">{t('app.sala.ruoli.moderatore')}</Chip>
                ) : null}
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
              <ChatAula aulaId={id} puoScrivere={data.mieiPermessi.scrivere} />
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
 * I materiali, raggruppati per argomento; gli sciolti in fondo.
 *
 * **Si scrivono, non solo si leggono**: prima da qui si poteva soltanto
 * guardare l'elenco, e caricare la foto degli appunti — il gesto più naturale
 * che si faccia da un telefono — richiedeva di aprire il computer.
 *
 * Il caricamento è lo stesso a tre tempi del composer dei post, con lo stesso
 * aiuto di scelta (`lib/scelta-file`) e la stessa funzione condivisa: si dichiarano nome,
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
  /**
   * Il foglio ha due tempi: prima **cosa** si aggiunge, poi — solo per
   * l'argomento, che è l'unica cosa che si scrive invece di sceglierla — come
   * si chiama. I due caricamenti non hanno un secondo tempo: aprono il
   * selettore di sistema, che è già un foglio.
   */
  const [foglio, setFoglio] = useState<'chiuso' | 'scelte' | 'argomento'>('chiuso');

  const aggiungiArgomento = useApiMutation({
    mutationFn: (titolo: string) => creaArgomento(aulaId, { titolo }),
    invalida: [chiaveSala as never],
    onSuccess: () => {
      setNuovoArgomento('');
      setFoglio('chiuso');
    },
  });

  const togliArgomento = useApiMutation({
    mutationFn: (argomentoId: string) => eliminaArgomento(aulaId, argomentoId),
    invalida: [chiaveSala as never],
  });

  const togliFile = useApiMutation({
    mutationFn: (materialeId: string) => eliminaMaterialeAula(aulaId, materialeId),
    invalida: [chiaveSala as never],
  });

  /**
   * Mettere da parte e togliere sono lo stesso gesto visto da due stati, e
   * invalidano le stesse due letture: la sala, che disegna il segnalibro, e la
   * raccolta, che è la schermata dove quel gesto si vede arrivare.
   */
  const segnalibro = useApiMutation({
    mutationFn: ({ id, salvato }: { id: string; salvato: boolean }) =>
      salvato ? dimenticaMateriale(id) : salvaMateriale(id),
    invalida: [chiaveSala as never, getElencaMaterialiSalvatiQueryKey() as never],
  });

  const condividi = useApiMutation({
    mutationFn: (chiave: string) => condividiMaterialeAula(aulaId, { chiave }),
    invalida: [chiaveSala as never],
  });

  /**
   * Porta nell'aula un file già scelto.
   *
   * Il tipo lo si verifica **prima** di chiedere la pre-autorizzazione: un
   * rifiuto locale è immediato e non consuma una chiave che resterebbe
   * prenotata a vuoto.
   */
  const caricaMateriale = async (scelto: FileScelto) => {
    if (!scelto.tipo) return;
    const tipo = scelto.tipo;

    setInCaricamento(true);
    try {
      const { data } = await preautorizzaMaterialeAula(aulaId, {
        nome: scelto.nome,
        tipo,
        dimensione: scelto.dimensione,
      });
      await caricaConAvanzamento({
        url: data.url,
        // Il riferimento al file locale, non i byte: li legge il livello
        // nativo mentre invia.
        corpo: { uri: scelto.uri, name: scelto.nome, type: scelto.mimeType },
        intestazioni: { 'content-type': scelto.mimeType },
      });
      condividi.mutate(data.chiave);
    } finally {
      setInCaricamento(false);
    }
  };

  // Il foglio si chiude **prima** di aprire il selettore di sistema: due
  // sovrapposizioni una sull'altra, su iOS, sono il modo classico di ritrovarsi
  // con un selettore che non compare affatto.
  const scegliFile = async () => {
    setFoglio('chiuso');
    const scelto = await scegliDocumento();
    if (scelto) await caricaMateriale(scelto);
  };

  const scegliDallaGalleria = async () => {
    setFoglio('chiuso');
    const scelta = await scegliFoto();
    if (scelta) await caricaMateriale(scelta);
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

  const puoAggiungere = puoCaricare || sala.sonoModeratore;

  return (
    <View style={{ flex: 1 }}>
      <Screen
        scorrevole
        conAreaSicura={false}
        // Spazio in fondo perché la chiamata fluttuante non copra l'ultimo
        // argomento dell'elenco.
        style={puoAggiungere ? { paddingBottom: tema.spaziatura[20] } : undefined}
      >
        {inCaricamento || condividi.isPending ? (
          <Text variante="corpoTenue">{t('app.sala.caricamentoInCorso')}</Text>
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
                  onSegnalibro={() =>
                    segnalibro.mutate({ id: file.id, salvato: Boolean(file.salvato) })
                  }
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

      {/* Una chiamata sola in fondo, e la scelta di cosa aggiungere dentro un
          foglio. Prima in cima c'erano due bottoni di caricamento e, sotto, un
          campo vuoto con accanto un «Salva» spento: un tasto che non si può
          premere, in mezzo a una pagina, non è un invito a scrivere — è un
          pezzo di modulo lasciato lì. */}
      {puoAggiungere ? (
        <PulsanteFluttuante etichetta={t('app.sala.aggiungi')} onPress={() => setFoglio('scelte')} />
      ) : null}

      <Foglio
        aperto={foglio === 'scelte'}
        titolo={t('app.sala.aggiungi')}
        onChiudi={() => setFoglio('chiuso')}
      >
        <Text variante="corpoTenue">{t('app.sala.aggiungiAiuto')}</Text>
        <Elenco>
          {puoCaricare ? (
            // Archivio dei documenti e rullino: due posti diversi, e su iOS le
            // foto stanno solo nel secondo.
            <RigaElenco
              icona="carica"
              tinta="blu"
              etichetta={t('app.sala.caricaMateriale')}
              onPress={() => void scegliFile()}
            />
          ) : null}
          {puoCaricare ? (
            <RigaElenco
              icona="fotocamera"
              tinta="ambra"
              etichetta={t('app.sala.caricaDallaGalleria')}
              onPress={() => void scegliDallaGalleria()}
            />
          ) : null}
          {sala.sonoModeratore ? (
            <RigaElenco
              icona="cartella"
              tinta="menta"
              etichetta={t('app.sala.nuovoArgomento')}
              onPress={() => setFoglio('argomento')}
            />
          ) : null}
        </Elenco>
      </Foglio>

      <Foglio
        aperto={foglio === 'argomento'}
        titolo={t('app.sala.nuovoArgomento')}
        onChiudi={() => setFoglio('chiuso')}
      >
        <Input
          etichetta={t('app.sala.titoloArgomento')}
          value={nuovoArgomento}
          onChangeText={setNuovoArgomento}
          autoFocus
        />
        <Button
          titolo={t('app.sala.creaArgomento')}
          larghezzaPiena
          disabled={!nuovoArgomento.trim()}
          inCaricamento={aggiungiArgomento.isPending}
          onPress={() => aggiungiArgomento.mutate(nuovoArgomento.trim())}
        />
      </Foglio>
    </View>
  );
}

function RigaMateriale({
  file,
  ultima,
  puoEliminare,
  onElimina,
  onSegnalibro,
}: {
  file: MaterialeDto;
  ultima: boolean;
  puoEliminare: boolean;
  onElimina: () => void;
  onSegnalibro: () => void;
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

      {/* Il segnalibro: **lo stato lo dichiara il server** (`salvato`), non si
          deduce incrociando due elenchi in ogni schermata. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          file.salvato ? t('app.materialiSalvati.salvato') : t('app.materialiSalvati.salva')
        }
        accessibilityState={{ selected: file.salvato }}
        hitSlop={10}
        onPress={onSegnalibro}
      >
        <Icona nome="salva" dimensione={18} colore={file.salvato ? 'accento' : 'debole'} />
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

  /** Chi si sta invitando altrove: nessuno, finché non si tocca la busta. */
  const [invitato, setInvitato] = useState<PartecipanteDto | undefined>(undefined);

  // Solo le aule che modero: sono le uniche in cui posso invitare qualcuno.
  const aule = useElencaAuleStudio({ limit: 50 });
  const mieAule = (aule.data?.data ?? []).filter((a) => a.sonoModeratore);

  const invita = useApiMutation({
    mutationFn: ({ aulaId: dove, utenteId }: { aulaId: string; utenteId: string }) =>
      invitaUtenteInAulaStudio(dove, { utenteId }),
    invalida: [],
    onSuccess: () => setInvitato(undefined),
  });

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
    <Screen scorrevole conAreaSicura={false}>
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
          onInvita={() => setInvitato(partecipante)}
        />
      ))}

      {/* L'invito nasce **dalla persona**, non da un modulo: si sceglie in
          quale delle proprie aule portarla. Solo quelle che si moderano —
          invitare in un'aula altrui non è un gesto che esiste. */}
      <Foglio
        aperto={Boolean(invitato)}
        titolo={t('app.sala.invitaAltrove')}
        onChiudi={() => setInvitato(undefined)}
      >
        <Text variante="corpoTenue">{t('app.sala.invitaAltroveSub')}</Text>
        {mieAule.length ? (
          <Elenco>
            {mieAule.map((aula) => (
              <RigaElenco
                key={aula.id}
                icona="aule"
                tinta="menta"
                etichetta={aula.titolo}
                disabilitato={invita.isPending}
                onPress={() => {
                  if (!invitato) return;
                  invita.mutate({ aulaId: aula.id, utenteId: invitato.utenteId });
                }}
              />
            ))}
          </Elenco>
        ) : (
          <Text variante="corpoTenue">{t('app.sala.nessunaAulaDaModerare')}</Text>
        )}
      </Foglio>
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
  onInvita,
}: {
  partecipante: PartecipanteDto;
  puoModerare: boolean;
  sonoIo: boolean;
  onCambia: (permesso: NomePermesso, concedi: boolean) => void;
  onPromuovi: () => void;
  onRetrocedi: () => void;
  onRimuovi: () => void;
  onInvita: () => void;
}) {
  const tema = useTema();
  const t = useT();
  const nome =
    [partecipante.nome, partecipante.cognome].filter(Boolean).join(' ') ||
    t('comune.utenteRimosso');

  /*
   * Lo dice il server (`contattabile`), e per questo il pulsante può essere
   * spento **prima** del gesto, con la sua ragione a schermo: scoprire un
   * divieto di privacy da un errore, dopo aver premuto, è il modo peggiore di
   * dirlo — sembra un guasto e non una scelta di qualcun altro.
   */
  const puoInvitare = partecipante.contattabile === true && !sonoIo && !partecipante.rimosso;
  const invitoNegato = partecipante.contattabile === false && !sonoIo && !partecipante.rimosso;

  return (
    <Card style={{ gap: tema.spaziatura[3] }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: tema.spaziatura[3] }}>
        <Avatar nome={nome} foto={partecipante.foto} dimensione={38} />
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

        {puoInvitare || invitoNegato ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              puoInvitare ? t('app.sala.invitaAltrove') : t('app.sala.nonContattabile')
            }
            accessibilityState={{ disabled: !puoInvitare }}
            disabled={!puoInvitare}
            hitSlop={8}
            onPress={onInvita}
            style={{ opacity: puoInvitare ? 1 : 0.4 }}
          >
            <Icona nome="posta" dimensione={19} colore={puoInvitare ? 'accento' : 'debole'} />
          </Pressable>
        ) : null}
      </View>

      {/* La ragione, scritta: un'icona spenta senza spiegazione somiglia a una
          funzione rotta. */}
      {invitoNegato ? (
        <Text variante="didascalia" style={{ fontSize: 11.5 }}>
          {t('app.sala.nonContattabile')}
        </Text>
      ) : null}

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
