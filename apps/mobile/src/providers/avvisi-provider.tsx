import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Animated, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { configuraFeedback, type Avvisatore } from '@prome/app-core';
import { useTema } from '@/theme';
import { useI18n } from '@/i18n/i18n-provider';
import { Text } from '@/components/ui';

type TipoAvviso = 'successo' | 'errore' | 'info';

interface Avviso {
  id: number;
  tipo: TipoAvviso;
  messaggio: string;
  descrizione?: string;
}

const DURATA_MS = 4000;

/**
 * Collega il canale di feedback condiviso all'app mobile.
 *
 * Da qui in poi le chiamate API mostrano l'esito da sole, esattamente come sul
 * web: le schermate scrivono la mutazione e non devono gestire i messaggi.
 *
 * L'avviso compare in alto, sotto la barra di stato, e scompare da solo; si
 * può chiudere toccandolo, perché sul telefono può coprire ciò che serve.
 */
export function AvvisiProvider({ children }: { children: ReactNode }) {
  const [avviso, setAvviso] = useState<Avviso | null>(null);
  const { t } = useI18n();

  const mostra = useCallback((nuovo: Omit<Avviso, 'id'>) => {
    setAvviso({ ...nuovo, id: Date.now() });
  }, []);

  /**
   * Si chiude **per identificativo**, non «l'avviso corrente».
   *
   * L'animazione di uscita chiama questa funzione quando finisce, e in quel
   * momento potrebbe già esserci un avviso nuovo: azzerare alla cieca farebbe
   * sparire il messaggio appena arrivato, che è il difetto peggiore proprio
   * perché sembra un caso isolato e non si riproduce a comando.
   */
  const chiudi = useCallback((id: number) => {
    setAvviso((corrente) => (corrente?.id === id ? null : corrente));
  }, []);

  useEffect(() => {
    const avvisatore: Avvisatore = {
      successo: (messaggio, opzioni) =>
        mostra({ tipo: 'successo', messaggio, descrizione: opzioni?.descrizione }),
      errore: (messaggio, opzioni) =>
        mostra({ tipo: 'errore', messaggio, descrizione: opzioni?.descrizione }),
      info: (messaggio, opzioni) =>
        mostra({ tipo: 'info', messaggio, descrizione: opzioni?.descrizione }),
    };

    // I due messaggi predefiniti si rileggono a ogni cambio di lingua: la
    // dipendenza da `t` è la ragione per cui la configurazione si rifà, e
    // costa una riconfigurazione per un gesto che capita di rado.
    configuraFeedback({
      avvisatore,
      messaggioSuccessoPredefinito: () => t('comune.operazioneCompletata'),
      messaggioErrorePredefinito: () => t('errori.generico.titolo'),
    });
  }, [mostra, t]);

  return (
    <>
      {children}
      {avviso ? (
        <AvvisoInSovrimpressione
          key={avviso.id}
          avviso={avviso}
          onChiudi={chiudi}
        />
      ) : null}
    </>
  );
}

function AvvisoInSovrimpressione({
  avviso,
  onChiudi,
}: {
  avviso: Avviso;
  onChiudi: (id: number) => void;
}) {
  const tema = useTema();
  const bordi = useSafeAreaInsets();

  // Costruito **una volta sola**: con un ref il valore animato nascerebbe a
  // ogni disegno per essere subito buttato via, e leggerlo durante il render
  // è proprio ciò che React non garantisce più.
  const [animazione] = useState(() => new Animated.Value(0));

  const id = avviso.id;

  useEffect(() => {
    Animated.spring(animazione, {
      toValue: 1,
      useNativeDriver: true,
      damping: 18,
      stiffness: 180,
    }).start();

    // Le dipendenze sono solo valori stabili: il conto alla rovescia parte una
    // volta e arriva in fondo. Con una funzione ricreata a ogni disegno del
    // padre, il timer ripartiva da capo e l'avviso restava a schermo più a
    // lungo del previsto — un difetto che si vede solo guardando l'orologio.
    const timer = setTimeout(() => {
      Animated.timing(animazione, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }).start(() => onChiudi(id));
    }, DURATA_MS);

    return () => clearTimeout(timer);
  }, [animazione, id, onChiudi]);

  const sfondi: Record<TipoAvviso, string> = {
    successo: tema.colori.successo,
    errore: tema.colori.errore,
    info: tema.colori.superficieAlt,
  };
  const testi: Record<TipoAvviso, string> = {
    successo: tema.colori.successoTesto,
    errore: tema.colori.erroreTesto,
    info: tema.colori.testo,
  };

  const scorrimento = animazione.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] });

  return (
    <Animated.View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        top: bordi.top + tema.spaziatura[2],
        left: tema.spaziatura[4],
        right: tema.spaziatura[4],
        opacity: animazione,
        transform: [{ translateY: scorrimento }],
      }}
    >
      <Pressable
        onPress={() => onChiudi(id)}
        accessibilityRole="alert"
        accessibilityLabel={avviso.messaggio}
        style={[
          {
            backgroundColor: sfondi[avviso.tipo],
            borderRadius: tema.raggio.xl,
            paddingVertical: tema.spaziatura[3],
            paddingHorizontal: tema.spaziatura[4],
            gap: 2,
          },
          tema.ombra.lg,
        ]}
      >
        <Text variante="etichetta" style={{ color: testi[avviso.tipo] }}>
          {avviso.messaggio}
        </Text>
        {avviso.descrizione ? (
          <Text variante="didascalia" style={{ color: testi[avviso.tipo], opacity: 0.8 }}>
            {avviso.descrizione}
          </Text>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}
