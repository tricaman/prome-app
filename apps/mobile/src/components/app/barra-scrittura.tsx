import type { ReactNode } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTema } from '@/theme';
import { useT } from '@/hooks';
import { Icona, Text } from '@/components/ui';

/** Sotto questa soglia il contatore compare: prima è rumore. */
const AVVISO_CARATTERI = 120;

/** Altezza di una riga di scrittura: la misura su cui si allinea la barra. */
const ALTEZZA_RIGA = 42;

export interface BarraScritturaProps {
  valore: string;
  onValore: (testo: string) => void;
  segnaposto: string;
  /** Il limite del server, non un numero scelto qui. */
  massimo: number;
  inInvio: boolean;
  onInvia: () => void;
  /** Cosa fa il tasto, per chi non vede lo schermo. */
  etichettaInvio: string;
  /** A sinistra del campo: l'avatar di chi scrive. */
  guida?: ReactNode;
  /**
   * Con `false` non prende la barra gesti: serve quando la barra sta dentro
   * una scheda, non appoggiata al fondo dello schermo.
   */
  conAreaSicura?: boolean;
  /** Con `false` non disegna il filo e lo sfondo della barra di fondo. */
  conCornice?: boolean;
}

/**
 * La riga in cui si scrive: un messaggio, un commento.
 *
 * È **una sola** perché una chat e un commento si scrivono allo stesso modo, e
 * due barre diverse nella stessa app sono due posti in cui imparare dove sta
 * il tasto. La forma è quella che tutti conoscono — pillola bassa che cresce
 * con il testo, tondo pieno a destra che si accende quando c'è qualcosa da
 * mandare — e ha sostituito un riquadro alto tre righe con sotto un bottone
 * «Invia» largo e un contatore sempre acceso: quella è la forma di un modulo,
 * e sotto un post nessuno compila un modulo.
 */
export function BarraScrittura({
  valore,
  onValore,
  segnaposto,
  massimo,
  inInvio,
  onInvia,
  etichettaInvio,
  guida,
  conAreaSicura = true,
  conCornice = true,
}: BarraScritturaProps) {
  const tema = useTema();
  const t = useT();
  const bordi = useSafeAreaInsets();

  const puoInviare = Boolean(valore.trim()) && !inInvio;
  const restanti = massimo - valore.length;

  return (
    <View
      style={[
        {
          paddingTop: tema.spaziatura[2],
          paddingBottom: conAreaSicura
            ? Math.max(bordi.bottom, tema.spaziatura[3])
            : tema.spaziatura[2],
          gap: tema.spaziatura[1],
        },
        conCornice && {
          borderTopWidth: 1,
          borderTopColor: tema.colori.bordo,
          backgroundColor: tema.colori.superficie,
          paddingHorizontal: tema.spaziatura[3],
        },
      ]}
    >
      {/* Il contatore compare quando il limite è vicino: prima è un numero che
          nessuno guarda, e a duemila caratteri non lo sfiora nessuno. */}
      {restanti <= AVVISO_CARATTERI ? (
        <Text
          variante="didascalia"
          allineamento="right"
          colore={restanti <= 0 ? 'errore' : undefined}
          style={{ fontSize: 11 }}
        >
          {restanti}
        </Text>
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: tema.spaziatura[2] }}>
        {/* Avatar e tondo d'invio sono più bassi del campo: centrati sulla
            **prima riga**, restano in linea con il testo quando la riga è una
            e con l'ultima quando il campo cresce. Appoggiati in fondo com'era
            prima, sedevano otto punti più in basso di tutto il resto. */}
        {guida ? (
          <View style={{ height: ALTEZZA_RIGA, justifyContent: 'center' }}>{guida}</View>
        ) : null}

        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            minHeight: ALTEZZA_RIGA,
            borderRadius: tema.raggio['2xl'],
            borderWidth: 1,
            borderColor: tema.colori.bordo,
            backgroundColor: tema.colori.campo,
            paddingHorizontal: tema.spaziatura[4],
          }}
        >
          <TextInput
            value={valore}
            onChangeText={onValore}
            placeholder={segnaposto}
            placeholderTextColor={tema.colori.campoSegnaposto}
            multiline
            maxLength={massimo}
            style={{
              color: tema.colori.campoTesto,
              fontSize: 15,
              lineHeight: 20,
              paddingTop: tema.spaziatura[2] + 2,
              paddingBottom: tema.spaziatura[2] + 2,
              // Cresce con il testo, ma non si mangia ciò che sta sopra.
              maxHeight: 120,
            }}
          />
        </View>

        {/* Il tondo si accende solo quando c'è qualcosa da mandare: spento non
            si preme, e non c'è bisogno di spiegare perché. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={inInvio ? t('comune.caricamento') : etichettaInvio}
          accessibilityState={{ disabled: !puoInviare }}
          disabled={!puoInviare}
          onPress={onInvia}
          style={{
            width: ALTEZZA_RIGA,
            height: ALTEZZA_RIGA,
            borderRadius: tema.raggio.full,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: puoInviare ? tema.colori.primario : tema.colori.superficieAlt2,
            opacity: inInvio ? 0.6 : 1,
          }}
        >
          <Icona nome="invia" dimensione={19} colore={puoInviare ? 'primarioTesto' : 'debole'} />
        </Pressable>
      </View>
    </View>
  );
}
