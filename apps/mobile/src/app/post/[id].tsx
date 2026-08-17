import { useState } from 'react';
import { Linking, Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { pesoLeggibile, statusErrore } from '@prome/app-core';
import {
  eliminaPost,
  getElencaPostQueryKey,
  getLeggiPostQueryKey,
  modificaPost,
  useLeggiPost,
  type AllegatoDto,
} from '@prome/api-client';
import { LUNGHEZZA_MASSIMA_POST } from '@prome/contracts';
import { useTema } from '@/theme';
import { useApiMutation, useConferma, useT } from '@/hooks';
import { TarghettaAllegato } from '@/components/contenuti';
import { SegnalaEBlocca } from '@/components/app/segnala-e-blocca';
import { Commenti } from '@/components/app/commenti';
import { ErrorState, QueryBoundary, RisorsaNonTrovata } from '@/components/feedback';
import {
  Avatar,
  AzioneTonda,
  Button,
  Card,
  Elenco,
  Foglio,
  Icona,
  Input,
  Intestazione,
  RigaElenco,
  Screen,
  Text,
} from '@/components/ui';

/**
 * Dettaglio di un post, con la sua discussione.
 *
 * Post e commenti sono due richieste, non una: i commenti sono un aggregato
 * autonomo, e chiederli insieme al post li farebbe sembrare un suo campo —
 * con la conseguenza pratica che ogni nuovo commento invaliderebbe anche il
 * post.
 */
export default function SchermataPost() {
  const tema = useTema();
  const t = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const post = useLeggiPost(id);

  const [foglio, setFoglio] = useState<'chiuso' | 'opzioni' | 'modifica'>('chiuso');
  const mio = post.data?.data.puoModificare ?? false;

  return (
    <>
      <Intestazione
        conIndietro
        // I tre puntini solo sul proprio post: su quello altrui non c'è nulla
        // dietro — segnalare e bloccare hanno il loro posto, in fondo al post,
        // e nasconderli qui li renderebbe più difficili proprio a chi ne ha
        // bisogno.
        azioni={
          mio ? (
            <AzioneTonda
              icona="altro"
              etichetta={t('app.post.opzioni')}
              onPress={() => setFoglio('opzioni')}
            />
          ) : undefined
        }
      />
      <Screen scorrevole conAreaSicura={false}>
        <QueryBoundary query={post}
          errore={(errore, riprova) =>
            statusErrore(errore) === 404 ? (
              <RisorsaNonTrovata />
            ) : (
              <ErrorState errore={errore} onRiprova={riprova} />
            )
          }
        >
          {({ data }) => {
            const autore =
              [data.autore.nome, data.autore.cognome].filter(Boolean).join(' ') ||
              t('comune.utenteRimosso');

            return (
              <View style={{ gap: tema.spaziatura[4] }}>
                <Card>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: tema.spaziatura[3],
                    }}
                  >
                    <Avatar nome={autore} foto={data.autore.foto} dimensione={44} />
                    <View style={{ flex: 1 }}>
                      <Text variante="etichetta">{autore}</Text>
                      <Text variante="didascalia">
                        {[data.autore.universita, new Date(data.creatoIl).toLocaleDateString()]
                          .filter(Boolean)
                          .join(' · ')}
                      </Text>
                    </View>
                  </View>

                  <Text variante="corpo" style={{ marginTop: tema.spaziatura[3] }}>
                    {data.testo}
                  </Text>

                  {data.allegati.map((allegato) => (
                    <RigaAllegato key={allegato.id} allegato={allegato} />
                  ))}

                  {/* Sui contenuti altrui, mai sui propri né su un autore
                      rimosso: da qui ci si difende (linea guida 1.2). */}
                  {!data.puoModificare && !data.autore.rimosso ? (
                    <View style={{ marginTop: tema.spaziatura[3] }}>
                      <SegnalaEBlocca
                        tipo="POST"
                        soggettoId={data.id}
                        autore={{ utenteId: data.autore.utenteId, nome: autore }}
                        invalidaAlBlocco={[getElencaPostQueryKey()]}
                        // Bloccato l'autore, il post non esiste più per chi
                        // guarda: restare qui mostrerebbe un errore per una
                        // cosa riuscita.
                        onBloccato={() => router.back()}
                      />
                    </View>
                  ) : null}
                </Card>

                <Card>
                  <Text variante="sottotitolo">{t('app.post.titoloCommenti')}</Text>
                  <View style={{ marginTop: tema.spaziatura[3] }}>
                    <Commenti postId={id} />
                  </View>
                </Card>
              </View>
            );
          }}
        </QueryBoundary>
      </Screen>

      <OpzioniPost
        aperto={foglio}
        onCambia={setFoglio}
        postId={id}
        testo={post.data?.data.testo ?? ''}
      />
    </>
  );
}

/**
 * Cosa si può fare con il **proprio** post.
 *
 * Le due azioni stavano sparse nella pagina, e l'eliminazione era un bottone
 * rosso a portata di pollice accanto al testo: un gesto che non si annulla non
 * si mette in mezzo a ciò che si legge. Stanno dietro i tre puntini, che è il
 * posto in cui tutti le cercano.
 *
 * **L'eliminazione si conferma sulla riga stessa**: la prima pressione cambia
 * la parola in «Conferma eliminazione», la seconda esegue. Un avviso di
 * sistema, alla terza volta, è un «Sì» premuto senza leggere; una riga che
 * cambia parola sotto il dito, no.
 */
function OpzioniPost({
  aperto,
  onCambia,
  postId,
  testo,
}: {
  aperto: 'chiuso' | 'opzioni' | 'modifica';
  onCambia: (foglio: 'chiuso' | 'opzioni' | 'modifica') => void;
  postId: string;
  testo: string;
}) {
  const t = useT();
  const [bozza, setBozza] = useState(testo);

  const salva = useApiMutation({
    mutationFn: () => modificaPost(postId, { testo: bozza.trim() }),
    invalida: [getLeggiPostQueryKey(postId) as never, getElencaPostQueryKey() as never],
    onSuccess: () => onCambia('chiuso'),
  });

  const elimina = useApiMutation({
    mutationFn: () => eliminaPost(postId),
    invalida: [getElencaPostQueryKey() as never],
    // Il post non c'è più: restare qui mostrerebbe un errore per una cosa
    // riuscita.
    onSuccess: () => {
      onCambia('chiuso');
      router.back();
    },
  });

  const conferma = useConferma(() => elimina.mutate(undefined));

  return (
    <>
      <Foglio
        aperto={aperto === 'opzioni'}
        titolo={t('app.post.opzioni')}
        onChiudi={() => {
          conferma.annulla();
          onCambia('chiuso');
        }}
      >
        <Elenco>
          <RigaElenco
            icona="matita"
            tinta="menta"
            etichetta={t('app.post.modifica')}
            onPress={() => {
              setBozza(testo);
              onCambia('modifica');
            }}
          />
          <RigaElenco
            icona="cestino"
            etichetta={conferma.armata ? t('app.post.confermaEliminazione') : t('app.post.elimina')}
            sottotitolo={conferma.armata ? t('app.post.eliminaAvviso') : undefined}
            distruttiva
            disabilitato={elimina.isPending}
            onPress={conferma.premi}
          />
        </Elenco>
      </Foglio>

      <Foglio
        aperto={aperto === 'modifica'}
        titolo={t('app.post.modifica')}
        onChiudi={() => onCambia('chiuso')}
      >
        <Input
          etichetta={t('app.post.testo')}
          value={bozza}
          onChangeText={setBozza}
          righe={5}
          massimoCaratteri={LUNGHEZZA_MASSIMA_POST}
        />
        <Button
          titolo={t('app.post.salva')}
          larghezzaPiena
          disabled={!bozza.trim() || bozza.trim() === testo}
          inCaricamento={salva.isPending}
          onPress={() => salva.mutate(undefined)}
        />
      </Foglio>
    </>
  );
}

/**
 * Un allegato si apre fuori dall'app.
 *
 * Un visore incorporato dovrebbe reggere PDF, immagini e testo con i gesti di
 * zoom e scorrimento che ciascun formato si aspetta: il sistema lo fa già, e
 * meglio.
 */
function RigaAllegato({ allegato }: { allegato: AllegatoDto }) {
  const tema = useTema();

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={allegato.nome}
      onPress={() => void Linking.openURL(allegato.url)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: tema.spaziatura[3],
        marginTop: tema.spaziatura[3],
        backgroundColor: tema.colori.superficieAlt,
        borderColor: tema.colori.bordo,
        borderWidth: 1,
        borderRadius: tema.raggio.lg,
        padding: tema.spaziatura[3],
      }}
    >
      <TarghettaAllegato tipo={tipoDiTarghetta(allegato.tipo)} />
      <View style={{ flex: 1 }}>
        <Text variante="etichetta" numberOfLines={1}>
          {allegato.nome}
        </Text>
        <Text variante="didascalia">{pesoLeggibile(allegato.dimensione)}</Text>
      </View>
      <Icona nome="avanti" dimensione={18} />
    </Pressable>
  );
}

const tipoDiTarghetta = (tipo: AllegatoDto['tipo']) =>
  tipo === 'PDF' ? 'pdf' : tipo === 'IMMAGINE' ? 'immagine' : 'testo';
