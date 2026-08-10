import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { AULE_IN_CORSO, CHAT, MATERIALI_AULA, PARTECIPANTI, UTENTE } from '@prome/contenuti';
import type { MessaggioChat } from '@prome/contenuti';
import { useTema } from '@/theme';
import { useT } from '@/hooks';
import { BarraAudio } from '@/components/app/barra-audio';
import {
  eSolaLettura,
  PERMESSI,
  permessiDi,
  permessiIniziali,
  type NomePermesso,
  type Permessi,
} from '@/components/app/permessi';
import { AnteprimaAllegato } from '@/components/contenuti';
import { EmptyState } from '@/components/feedback';
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

/**
 * Dentro un'aula studio.
 *
 * Le tre schede cambiano il contenuto ma non la barra dell'audio, che resta in
 * fondo: si può passare dai materiali alla chat senza perdere il filo di ciò
 * che si sta ascoltando.
 */
export default function SchermataAula() {
  const tema = useTema();
  const t = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const aula = AULE_IN_CORSO.find((voce) => voce.id === id);

  const [scheda, setScheda] = useState<Scheda>('chat');
  const [permessi, setPermessi] = useState<Record<string, Permessi>>(() =>
    permessiIniziali(PARTECIPANTI),
  );
  const [inAudio, setInAudio] = useState(false);
  const [microfonoSpento, setMicrofonoSpento] = useState(false);

  const io = PARTECIPANTI.find((partecipante) => partecipante.sonoIo);
  const mieiPermessi = io ? permessiDi(io, permessi) : undefined;

  const inAudioOra = PARTECIPANTI.filter(
    (partecipante) => !partecipante.sonoIo && permessiDi(partecipante, permessi).parlare,
  ).slice(0, 4);

  if (!aula) {
    return (
      <>
        <Intestazione conIndietro />
        <Screen centrato>
          <EmptyState
            titolo={t('errori.nonTrovato.titolo')}
            descrizione={t('errori.nonTrovato.descrizione')}
          />
        </Screen>
      </>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: tema.colori.sfondo }}>
      <Intestazione conIndietro />

      <View style={{ paddingHorizontal: tema.spaziatura[5], gap: tema.spaziatura[3] }}>
        <View style={{ gap: tema.spaziatura[2] }}>
          <Text variante="titolo">{aula.titolo}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tema.spaziatura[2] }}>
            <Chip tono="menta" indicatore>
              {t('pagine.aula.inCorso')}
            </Chip>
            <Chip>{aula.visibilita}</Chip>
          </View>
          <Text variante="didascalia">
            {aula.contesto} · {aula.partecipanti}
          </Text>
        </View>

        <Segmented
          etichetta={aula.titolo}
          valore={scheda}
          onChange={setScheda}
          opzioni={[
            { valore: 'chat', etichetta: t('app.sala.schede.chat') },
            { valore: 'materiali', etichetta: t('app.nav.materiali') },
            { valore: 'partecipanti', etichetta: t('app.sala.schede.partecipanti') },
          ]}
        />
      </View>

      {scheda === 'chat' ? <Chat puoScrivere={mieiPermessi?.scrivere ?? true} /> : null}
      {scheda === 'materiali' ? <Materiali /> : null}
      {scheda === 'partecipanti' ? (
        <Partecipanti
          permessi={permessi}
          onCambia={(idPartecipante, permesso, attivo) =>
            setPermessi((precedenti) => ({
              ...precedenti,
              [idPartecipante]: {
                ...(precedenti[idPartecipante] ?? {
                  parlare: true,
                  scrivere: true,
                  caricare: true,
                }),
                [permesso]: attivo,
              },
            }))
          }
        />
      ) : null}

      <BarraAudio
        inAudio={inAudio}
        microfonoSpento={microfonoSpento}
        puoParlare={mieiPermessi?.parlare ?? true}
        personeInAudio={inAudioOra.map((partecipante) => partecipante.nome)}
        partecipantiTotali={PARTECIPANTI.length}
        onEntra={() => setInAudio(true)}
        onEsci={() => {
          setInAudio(false);
          setMicrofonoSpento(false);
        }}
        onAlternaMicrofono={() => setMicrofonoSpento((spento) => !spento)}
      />
    </View>
  );
}

/** Chat dell'aula: i messaggi inviati sono immutabili, come nel dominio. */
function Chat({ puoScrivere }: { puoScrivere: boolean }) {
  const tema = useTema();
  const t = useT();
  const [messaggi, setMessaggi] = useState<readonly MessaggioChat[]>(CHAT);
  const [bozza, setBozza] = useState('');

  const invia = () => {
    const testo = bozza.trim();
    if (!testo) return;
    setMessaggi((precedenti) => [
      ...precedenti,
      { id: `mio-${precedenti.length}`, autore: UTENTE.nome, testo, ora: 'ora', mio: true },
    ]);
    setBozza('');
  };

  return (
    <>
      <ScrollView
        contentContainerStyle={{
          padding: tema.spaziatura[4],
          gap: tema.spaziatura[3],
        }}
      >
        {messaggi.map((messaggio) => (
          <View
            key={messaggio.id}
            style={{
              flexDirection: messaggio.mio ? 'row-reverse' : 'row',
              alignItems: 'flex-end',
              gap: tema.spaziatura[2],
            }}
          >
            {!messaggio.mio ? <Avatar nome={messaggio.autore} dimensione={30} soloColore /> : null}
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
                  {messaggio.autore}
                </Text>
              ) : null}
              <Text variante="corpo" style={{ fontSize: 14 }}>
                {messaggio.testo}
              </Text>
              <Text variante="didascalia" style={{ fontSize: 10.5, textAlign: 'right' }}>
                {messaggio.ora}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: tema.spaziatura[3],
          padding: tema.spaziatura[4],
          borderTopWidth: 1,
          borderTopColor: tema.colori.bordo,
          backgroundColor: tema.colori.superficie,
        }}
      >
        <View style={{ flex: 1 }}>
          <Input
            value={bozza}
            onChangeText={setBozza}
            placeholder={t('app.sala.scrivi')}
            editable={puoScrivere}
            onSubmitEditing={invia}
          />
        </View>
        <Button titolo={t('app.sala.invia')} disabled={!puoScrivere || !bozza.trim()} onPress={invia} />
      </View>
    </>
  );
}

/** Materiali raggruppati per Argomento; l'ultimo gruppo è "senza argomento". */
function Materiali() {
  const tema = useTema();
  const t = useT();

  return (
    <Screen scorrevole>
      {MATERIALI_AULA.map((gruppo) => (
        <View key={gruppo.nome ?? 'senza-argomento'} style={{ gap: tema.spaziatura[3] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: tema.spaziatura[2] }}>
            <View
              style={{
                width: 10,
                height: 10,
                borderRadius: 3,
                backgroundColor: gruppo.nome ? tema.colori.primario : tema.colori.bordoForte,
              }}
            />
            <Text variante="sottotitolo" style={{ fontSize: 17 }}>
              {gruppo.nome ?? t('app.sala.senzaArgomento')}
            </Text>
            <Text variante="didascalia">
              {t('app.sala.numeroFile', { numero: gruppo.file.length })}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tema.spaziatura[3] }}>
            {gruppo.file.map((file) => (
              <Card
                key={file.nome}
                style={{ padding: 0, overflow: 'hidden', width: '47%' }}
              >
                <AnteprimaAllegato tipo={file.tipo} altezza={80} />
                <View style={{ padding: tema.spaziatura[3] }}>
                  <Text variante="etichetta" numberOfLines={1} style={{ fontSize: 13 }}>
                    {file.nome}
                  </Text>
                  <Text variante="didascalia" numberOfLines={1}>
                    {file.dettaglio}
                  </Text>
                </View>
              </Card>
            ))}
          </View>
        </View>
      ))}

      <Button
        titolo={t('app.sala.caricaMateriale')}
        larghezzaPiena
        iconaSinistra={<Icona nome="carica" dimensione={18} colore="primarioTesto" />}
      />
    </Screen>
  );
}

/**
 * Partecipanti e permessi.
 *
 * Su un telefono la tabella a tre colonne del web non ci sta: ogni persona
 * diventa una scheda con i tre interruttori uno sotto l'altro, con lo stesso
 * comportamento — un Moderatore li ha sempre tutti e tre, e non si toccano.
 */
function Partecipanti({
  permessi,
  onCambia,
}: {
  permessi: Record<string, Permessi>;
  onCambia: (id: string, permesso: NomePermesso, attivo: boolean) => void;
}) {
  const tema = useTema();
  const t = useT();

  const solaLettura = PARTECIPANTI.filter(
    (partecipante) =>
      !partecipante.moderatore && eSolaLettura(permessiDi(partecipante, permessi)),
  ).map((partecipante) => partecipante.nome);

  return (
    <Screen scorrevole>
      {PARTECIPANTI.map((partecipante) => {
        const suoi = permessiDi(partecipante, permessi);
        return (
          <Card key={partecipante.id} style={{ gap: tema.spaziatura[3] }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: tema.spaziatura[3] }}>
              <Avatar
                nome={partecipante.nome}
                dimensione={40}
                evidenziato={partecipante.attivo}
              />
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: tema.spaziatura[2] }}>
                  <Text variante="etichetta" numberOfLines={1}>
                    {partecipante.nome}
                  </Text>
                  {partecipante.moderatore ? (
                    <Chip tono="menta">{t('app.sala.moderatore')}</Chip>
                  ) : null}
                </View>
                <Text variante="didascalia" numberOfLines={1}>
                  {partecipante.contesto}
                </Text>
              </View>
            </View>

            <View style={{ gap: tema.spaziatura[2] }}>
              {PERMESSI.map((permesso) => (
                <View
                  key={permesso}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: tema.spaziatura[3] }}
                >
                  <Text variante="corpo" style={{ flex: 1, fontSize: 14 }}>
                    {t(`app.sala.tabella.${permesso}`)}
                  </Text>
                  <Switch
                    etichetta={`${t(`app.sala.tabella.${permesso}`)} — ${partecipante.nome}`}
                    attivo={suoi[permesso]}
                    bloccatoAcceso={partecipante.moderatore}
                    onChange={(attivo) => onCambia(partecipante.id, permesso, attivo)}
                  />
                </View>
              ))}
            </View>
          </Card>
        );
      })}

      <Text variante="didascalia">
        {solaLettura.length === 0
          ? t('app.sala.notaPermessi')
          : solaLettura.length === 1
            ? t('app.sala.solaLettura', { nomi: solaLettura[0]! })
            : t('app.sala.solaLetturaPlurale', { nomi: solaLettura.join(', ') })}
      </Text>
    </Screen>
  );
}
