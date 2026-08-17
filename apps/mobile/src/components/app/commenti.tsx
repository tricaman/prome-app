import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import {
  commentaPost,
  eliminaCommento,
  getElencaCommentiQueryKey,
  getElencaPostQueryKey,
  useElencaCommenti,
  useLeggiMioProfilo,
  type CommentoDto,
} from '@prome/api-client';
import { LUNGHEZZA_MASSIMA_COMMENTO } from '@prome/contracts';
import { useTema } from '@/theme';
import { useApiMutation, useConferma, useI18n, useT } from '@/hooks';
import { QueryBoundary } from '@/components/feedback';
import { Avatar, Text } from '@/components/ui';
import { SegnalaEBlocca } from './segnala-e-blocca';
import { BarraScrittura } from './barra-scrittura';

/** Quanti se ne leggono in una volta: una discussione, non un archivio. */
const FINESTRA = 50;

export interface CommentiProps {
  postId: string;
  /**
   * Con `true` l'elenco scorre per conto proprio e la barra di scrittura resta
   * appoggiata in fondo: è la forma dentro il foglio. Con `false` l'elenco si
   * allunga e scorre la pagina, che è la forma dentro il dettaglio.
   */
  scorrevole?: boolean;
}

/**
 * La discussione sotto un post.
 *
 * **Vive in un posto solo** ed è la stessa sotto il foglio della bacheca e
 * dentro il dettaglio: erano due, e la seconda sarebbe rimasta indietro alla
 * prima correzione.
 *
 * La forma è quella di Facebook, perché è quella che nessuno deve imparare:
 * bolla grigia con dentro il nome in grassetto e il testo, e **sotto** la
 * bolla una riga di azioni minute — quando, elimina, segnala. Prima il testo
 * stava in una scheda con una ✕ in alto a destra dentro la bolla: la croce è
 * il gesto di chiudere, non di cancellare, ed era anche la cosa più vistosa di
 * un commento altrui.
 *
 * Si legge **dal più vecchio**, perché una discussione ha un ordine.
 */
export function Commenti({ postId, scorrevole = false }: CommentiProps) {
  const tema = useTema();
  const t = useT();
  const [testo, setTesto] = useState('');

  const io = useLeggiMioProfilo();
  const commenti = useElencaCommenti(postId, { limit: FINESTRA });
  const chiave = getElencaCommentiQueryKey(postId, { limit: FINESTRA });

  const invia = useApiMutation({
    mutationFn: () => commentaPost(postId, { testo: testo.trim() }),
    // Anche l'elenco dei post: il numero accanto al pulsante dei commenti sta
    // lì dentro, e senza questa riga resterebbe indietro di uno.
    invalida: [chiave as never, getElencaPostQueryKey() as never],
    onSuccess: () => setTesto(''),
  });

  const mioNome = [io.data?.data.nome, io.data?.data.cognome].filter(Boolean).join(' ');

  const elenco = (
    <QueryBoundary
      query={commenti}
      eVuoto={(risposta) => risposta.data.length === 0}
      vuoto={
        <View style={{ paddingVertical: tema.spaziatura[4] }}>
          <Text variante="corpoTenue" allineamento={scorrevole ? 'center' : 'left'}>
            {t('app.post.nessunCommento')}
          </Text>
        </View>
      }
    >
      {(risposta) => (
        <View style={{ gap: tema.spaziatura[3] }}>
          {risposta.data.map((commento) => (
            <RigaCommento key={commento.id} commento={commento} chiaveElenco={chiave} />
          ))}
        </View>
      )}
    </QueryBoundary>
  );

  const barra = (
    <BarraScrittura
      valore={testo}
      onValore={setTesto}
      segnaposto={t('app.post.scriviCommento')}
      massimo={LUNGHEZZA_MASSIMA_COMMENTO}
      inInvio={invia.isPending}
      onInvia={() => invia.mutate(undefined)}
      etichettaInvio={t('app.post.invia')}
      // La propria faccia accanto al campo: dice con quale identità si sta per
      // parlare, che è l'unica cosa che serve sapere prima di scrivere.
      guida={<Avatar nome={mioNome || '?'} foto={io.data?.data.foto} dimensione={34} />}
      conAreaSicura={scorrevole}
      conCornice={scorrevole}
    />
  );

  if (!scorrevole) {
    return (
      <View style={{ gap: tema.spaziatura[3] }}>
        {elenco}
        {barra}
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: tema.spaziatura[3], flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
      >
        {elenco}
      </ScrollView>
      {barra}
    </View>
  );
}

function RigaCommento({
  commento,
  chiaveElenco,
}: {
  commento: CommentoDto;
  chiaveElenco: readonly unknown[];
}) {
  const tema = useTema();
  const t = useT();
  const { lingua } = useI18n();
  const profilo = useLeggiMioProfilo();

  const autore =
    [commento.autore.nome, commento.autore.cognome].filter(Boolean).join(' ') ||
    t('comune.utenteRimosso');

  const elimina = useApiMutation({
    mutationFn: () => eliminaCommento(commento.id),
    invalida: [chiaveElenco as never, getElencaPostQueryKey() as never],
  });

  // Eliminare non si annulla: la prima pressione arma, la seconda esegue.
  const conferma = useConferma(() => elimina.mutate(undefined));

  // Sui commenti degli ALTRI, non dove manca il permesso di eliminare:
  // `puoEliminare` è vero anche per il proprietario del post sui commenti
  // altrui — che è esattamente chi deve potersi difendere.
  const mio = profilo.data?.data.utenteId === commento.autore.utenteId;
  const segnalabile = !mio && !commento.autore.rimosso;

  return (
    <View style={{ flexDirection: 'row', gap: tema.spaziatura[2] }}>
      <Avatar nome={autore} foto={commento.autore.foto} dimensione={34} />

      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <View
          style={{
            alignSelf: 'flex-start',
            maxWidth: '100%',
            backgroundColor: tema.colori.superficieAlt,
            borderRadius: tema.raggio.xl,
            paddingHorizontal: tema.spaziatura[3],
            paddingVertical: tema.spaziatura[2],
          }}
        >
          <Text variante="etichetta" style={{ fontSize: 13.5 }} numberOfLines={1}>
            {autore}
          </Text>
          <Text variante="corpo" style={{ fontSize: 14.5, lineHeight: 20 }}>
            {commento.testo}
          </Text>
        </View>

        {/* Le azioni stanno **sotto** la bolla e in piccolo, come il quando:
            sono cose che si fanno di rado, e dentro la bolla gridavano. */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: tema.spaziatura[3],
            paddingLeft: tema.spaziatura[3],
          }}
        >
          <Text variante="didascalia" style={{ fontSize: 11.5 }}>
            {quando(commento.creatoIl, lingua)}
          </Text>

          {/* Il permesso arriva dal server: ricalcolarlo qui vorrebbe dire
              tenere due copie della stessa regola, e questa sarebbe aggirabile. */}
          {commento.puoEliminare ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                conferma.armata ? t('app.post.confermaEliminazione') : t('app.post.eliminaCommento')
              }
              onPress={conferma.premi}
              disabled={elimina.isPending}
              hitSlop={8}
            >
              <Text
                variante="didascalia"
                colore="errore"
                style={{ fontSize: 11.5, fontWeight: tema.tipografia.peso.grassetto }}
              >
                {conferma.armata ? t('app.post.confermaEliminazione') : t('app.post.elimina')}
              </Text>
            </Pressable>
          ) : null}

          {segnalabile ? (
            <SegnalaEBlocca
              tipo="COMMENTO"
              soggettoId={commento.id}
              autore={{ utenteId: commento.autore.utenteId, nome: autore }}
              variante="compatta"
              // Bloccato l'autore del commento, spariscono i suoi commenti qui
              // e i suoi post dal feed.
              invalidaAlBlocco={[chiaveElenco, getElencaPostQueryKey()]}
            />
          ) : null}
        </View>
      </View>
    </View>
  );
}

/** «2 h fa» finché è recente, poi la data: sotto un post conta quanto è fresco. */
function quando(iso: string, lingua: string): string {
  const minuti = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (minuti < 1) return 'adesso';
  if (minuti < 60) return `${minuti} min`;
  const ore = Math.round(minuti / 60);
  if (ore < 24) return `${ore} h`;
  const giorni = Math.round(ore / 24);
  if (giorni <= 7) return `${giorni} g`;
  return new Date(iso).toLocaleDateString(lingua, { day: 'numeric', month: 'short' });
}
