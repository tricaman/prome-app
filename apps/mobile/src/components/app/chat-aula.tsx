import { useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LUNGHEZZA_MASSIMA_MESSAGGIO } from '@prome/contracts';
import type { MessaggioDiChatDto } from '@prome/api-client';
import { useTema } from '@/theme';
import { useChatAula, useI18n, useT, type StatoConnessione } from '@/hooks';
import { LoadingState } from '@/components/feedback';
import { BarraScrittura } from './barra-scrittura';
import { Avatar, Text } from '@/components/ui';

/**
 * Due messaggi di seguito della stessa persona, a pochi minuti l'uno
 * dall'altro, sono un discorso solo: si stringono, e il nome non si ripete.
 */
const STESSO_DISCORSO_MS = 5 * 60_000;

/** Larghezza dell'avatar: la tengono anche le bolle che non lo mostrano. */
const AVATAR = 30;

/**
 * La chat di un'aula studio.
 *
 * Ha la forma che chiunque riconosce da una chat — bolle, discorsi raggruppati,
 * giorni separati, ora dentro la bolla, barra di scrittura a pillola con un
 * solo tasto tondo — e non è vezzo: è la forma che non si deve imparare.
 *
 * Le decisioni che contano:
 *
 * - **I messaggi vicini della stessa persona si stringono in un discorso**: il
 *   nome una volta sola in cima, l'avatar una volta sola in fondo, due punti di
 *   spazio invece di dodici. Ripetere nome e faccia a ogni riga faceva sembrare
 *   tre battute di seguito tre conversazioni diverse.
 * - **L'ora sta dentro la bolla, in fondo a destra**, sulla stessa riga del
 *   testo quando ci sta: prima si prendeva una riga tutta sua, e una chat fatta
 *   di «ok» era una colonna di bolle alte il doppio del loro contenuto.
 * - **Niente bordi sulle bolle**: la mia è piena del colore del marchio, quella
 *   altrui è una superficie con un'ombra appena. Due bolle bordate una sopra
 *   l'altra sono un modulo, non una conversazione.
 * - **L'angolo in fondo si stringe sull'ultima bolla del discorso**: è il verso
 *   della coda, e dice da che parte arriva il messaggio anche a chi non
 *   distingue i due colori.
 * - **Lo stato della linea si vede solo quando è un problema.** «In tempo
 *   reale» scritto sempre era una riga fissa che non diceva niente: la riga
 *   compare quando la connessione manca, che è l'unico momento in cui cambia
 *   quello che uno fa.
 * - **La tastiera non copre più ciò che si scrive**: prima non c'era nulla che
 *   la scansasse, e su un telefono vero la barra di scrittura finiva sotto i
 *   tasti — un difetto che il simulatore con la tastiera fisica non mostra.
 */
export function ChatAula({ aulaId, puoScrivere }: { aulaId: string; puoScrivere: boolean }) {
  const tema = useTema();
  const t = useT();
  const { messaggi, stato, inCaricamento, invia } = useChatAula(aulaId);
  const [bozza, setBozza] = useState('');
  const [inInvio, setInInvio] = useState(false);
  const scorrimento = useRef<ScrollView>(null);

  const righe = useMemo(() => componiRighe(messaggi), [messaggi]);

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
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatoLinea stato={stato} />

      <ScrollView
        ref={scorrimento}
        contentContainerStyle={{
          paddingHorizontal: tema.spaziatura[3],
          paddingTop: tema.spaziatura[2],
          paddingBottom: tema.spaziatura[3],
          // I messaggi si appoggiano in basso, vicino a dove si scrive: una
          // conversazione di due battute appesa in cima allo schermo, con il
          // vuoto sotto, non somiglia a nessuna chat che si sia mai usata.
          flexGrow: 1,
          justifyContent: 'flex-end',
        }}
        keyboardShouldPersistTaps="handled"
        // Il dito che scende scosta la tastiera: è il gesto della chat.
        keyboardDismissMode="interactive"
        onContentSizeChange={() => scorrimento.current?.scrollToEnd({ animated: false })}
      >
        {inCaricamento ? <LoadingState /> : null}

        {!inCaricamento && righe.length === 0 ? (
          <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: tema.spaziatura[6] }}>
            <Text variante="corpoTenue" allineamento="center">
              {t('app.sala.nessunMessaggio')}
            </Text>
          </View>
        ) : null}

        {righe.map((riga) =>
          riga.tipo === 'giorno' ? (
            <SeparatoreGiorno key={riga.chiave} quando={riga.quando} />
          ) : (
            <Bolla
              key={riga.messaggio.id}
              messaggio={riga.messaggio}
              apreIlDiscorso={riga.apreIlDiscorso}
              chiudeIlDiscorso={riga.chiudeIlDiscorso}
            />
          ),
        )}
      </ScrollView>

      {puoScrivere ? (
        <BarraScrittura
          valore={bozza}
          onValore={setBozza}
          segnaposto={t('app.sala.scrivi')}
          massimo={LUNGHEZZA_MASSIMA_MESSAGGIO}
          inInvio={inInvio}
          onInvia={() => void manda()}
          etichettaInvio={t('app.sala.inviaMessaggio')}
        />
      ) : (
        // La sola lettura è uno stato legittimo, non un guasto da spiegare.
        <SolaLettura />
      )}
    </KeyboardAvoidingView>
  );
}

/** Una riga della chat: un messaggio, o il giorno che comincia. */
type Riga =
  | { tipo: 'giorno'; chiave: string; quando: Date }
  | {
      tipo: 'messaggio';
      messaggio: MessaggioDiChatDto;
      apreIlDiscorso: boolean;
      chiudeIlDiscorso: boolean;
    };

/**
 * Da un elenco di messaggi alle righe da disegnare.
 *
 * Sta fuori dal componente e non guarda il tema: è una decisione sui dati —
 * dove finisce un discorso e dove comincia un giorno — e si legge (e si
 * correggerebbe) senza sapere niente di come appare.
 */
function componiRighe(messaggi: MessaggioDiChatDto[]): Riga[] {
  const righe: Riga[] = [];

  messaggi.forEach((messaggio, indice) => {
    const quando = new Date(messaggio.inviatoIl);
    const precedente = messaggi[indice - 1];
    const successivo = messaggi[indice + 1];

    const giornoNuovo = !precedente || !stessoGiorno(new Date(precedente.inviatoIl), quando);
    if (giornoNuovo) {
      righe.push({ tipo: 'giorno', chiave: `giorno-${messaggio.id}`, quando });
    }

    righe.push({
      tipo: 'messaggio',
      messaggio,
      apreIlDiscorso: giornoNuovo || !continua(precedente, messaggio),
      chiudeIlDiscorso: !continua(messaggio, successivo),
    });
  });

  return righe;
}

/** Il secondo messaggio prosegue il discorso del primo? */
function continua(prima?: MessaggioDiChatDto, dopo?: MessaggioDiChatDto): boolean {
  if (!prima || !dopo) return false;
  if (prima.autore.utenteId !== dopo.autore.utenteId) return false;
  const distanza = new Date(dopo.inviatoIl).getTime() - new Date(prima.inviatoIl).getTime();
  return distanza >= 0 && distanza < STESSO_DISCORSO_MS && stessoGiorno(new Date(prima.inviatoIl), new Date(dopo.inviatoIl));
}

function stessoGiorno(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Il giorno, in una pillola al centro: la stessa di ogni chat. */
function SeparatoreGiorno({ quando }: { quando: Date }) {
  const tema = useTema();
  const t = useT();
  const { lingua } = useI18n();

  const oggi = new Date();
  const ieri = new Date(oggi);
  ieri.setDate(oggi.getDate() - 1);

  const etichetta = stessoGiorno(quando, oggi)
    ? t('app.sala.oggi')
    : stessoGiorno(quando, ieri)
      ? t('app.sala.ieri')
      : quando.toLocaleDateString(lingua, {
          day: 'numeric',
          month: 'long',
          // L'anno solo quando non è questo: scriverlo sempre invecchia ogni
          // conversazione di oggi.
          year: quando.getFullYear() === oggi.getFullYear() ? undefined : 'numeric',
        });

  return (
    <View style={{ alignItems: 'center', paddingVertical: tema.spaziatura[3] }}>
      <View
        style={{
          paddingHorizontal: tema.spaziatura[3],
          paddingVertical: 3,
          borderRadius: tema.raggio.full,
          backgroundColor: tema.colori.superficieAlt2,
        }}
      >
        <Text
          variante="didascalia"
          style={{ fontSize: 11, fontWeight: tema.tipografia.peso.grassetto }}
        >
          {etichetta}
        </Text>
      </View>
    </View>
  );
}

function Bolla({
  messaggio,
  apreIlDiscorso,
  chiudeIlDiscorso,
}: {
  messaggio: MessaggioDiChatDto;
  apreIlDiscorso: boolean;
  chiudeIlDiscorso: boolean;
}) {
  const tema = useTema();
  const t = useT();
  const { lingua } = useI18n();

  const mio = messaggio.mio;
  const nome =
    [messaggio.autore.nome, messaggio.autore.cognome].filter(Boolean).join(' ') ||
    t('comune.utenteRimosso');

  const ora = new Date(messaggio.inviatoIl).toLocaleTimeString(lingua, {
    hour: '2-digit',
    minute: '2-digit',
  });

  const angolo = tema.raggio.xl;
  const codaStretta = tema.raggio.sm;

  return (
    <View
      style={{
        flexDirection: mio ? 'row-reverse' : 'row',
        alignItems: 'flex-end',
        gap: tema.spaziatura[2],
        // Dentro il discorso le righe si toccano quasi; fra un discorso e
        // l'altro c'è il respiro che dice «qui cambia chi parla».
        marginTop: apreIlDiscorso ? tema.spaziatura[3] : 2,
      }}
    >
      {/* Lo spazio dell'avatar resta occupato anche dove l'avatar non c'è:
          senza, le bolle del discorso si sfalserebbero di trenta punti. */}
      {!mio ? (
        <View style={{ width: AVATAR }}>
          {chiudeIlDiscorso ? (
            <Avatar nome={nome} foto={messaggio.autore.foto} dimensione={AVATAR} />
          ) : null}
        </View>
      ) : null}

      <View
        style={[
          {
            maxWidth: '78%',
            backgroundColor: mio ? tema.colori.primario : tema.colori.superficie,
            paddingHorizontal: tema.spaziatura[3],
            paddingVertical: tema.spaziatura[2],
            borderRadius: angolo,
            borderBottomRightRadius: mio && chiudeIlDiscorso ? codaStretta : angolo,
            borderBottomLeftRadius: !mio && chiudeIlDiscorso ? codaStretta : angolo,
          },
          mio ? null : tema.ombra.sm,
        ]}
      >
        {!mio && apreIlDiscorso ? (
          <Text
            variante="didascalia"
            colore="accento"
            numberOfLines={1}
            style={{ fontWeight: tema.tipografia.peso.extra, marginBottom: 1 }}
          >
            {nome}
          </Text>
        ) : null}

        {/* Testo e ora sulla stessa riga finché ci stanno: è il modo in cui
            una chat resta compatta senza nascondere quando è arrivato. */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: tema.spaziatura[2] }}>
          <Text
            style={{
              flexShrink: 1,
              fontSize: 15,
              lineHeight: 20,
              color: mio ? tema.colori.primarioTesto : tema.colori.testoCorpo,
            }}
          >
            {messaggio.testo}
          </Text>
          <Text
            style={{
              fontSize: 10.5,
              lineHeight: 14,
              color: mio ? tema.colori.primarioTesto : tema.colori.testoDidascalia,
              opacity: mio ? 0.7 : 1,
            }}
          >
            {ora}
          </Text>
        </View>
      </View>
    </View>
  );
}

/**
 * La linea si vede solo quando manca.
 *
 * Connessa non si dice: è la condizione normale, e annunciarla in permanenza
 * insegna a non leggere quella riga proprio mentre serve.
 */
function StatoLinea({ stato }: { stato: StatoConnessione }) {
  const tema = useTema();
  const t = useT();

  if (stato === 'connesso') return null;

  const inCorso = stato === 'connessione';

  return (
    <View style={{ alignItems: 'center', paddingTop: tema.spaziatura[2] }}>
      <View
        style={{
          paddingHorizontal: tema.spaziatura[3],
          paddingVertical: 4,
          borderRadius: tema.raggio.full,
          backgroundColor: inCorso ? tema.colori.superficieAlt2 : tema.colori.erroreTenue,
        }}
      >
        <Text
          variante="didascalia"
          colore={inCorso ? 'tenue' : 'errore'}
          style={{ fontSize: 11.5, fontWeight: tema.tipografia.peso.grassetto }}
        >
          {t(`app.sala.linea.${stato}`)}
        </Text>
      </View>
    </View>
  );
}

function SolaLettura() {
  const tema = useTema();
  const t = useT();
  const bordi = useSafeAreaInsets();

  return (
    <View
      style={{
        borderTopWidth: 1,
        borderTopColor: tema.colori.bordo,
        backgroundColor: tema.colori.superficie,
        paddingHorizontal: tema.spaziatura[5],
        paddingTop: tema.spaziatura[3],
        paddingBottom: Math.max(bordi.bottom, tema.spaziatura[3]),
      }}
    >
      <Text variante="corpoTenue" allineamento="center" style={{ fontSize: 13 }}>
        {t('app.sala.solaLetturaSpiegazione')}
      </Text>
    </View>
  );
}
