import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Pressable, View } from 'react-native';
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
  const traduci = useRef(t);
  traduci.current = t;

  const mostra = useCallback((nuovo: Omit<Avviso, 'id'>) => {
    setAvviso({ ...nuovo, id: Date.now() });
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

    configuraFeedback({
      avvisatore,
      messaggioSuccessoPredefinito: () => traduci.current('comune.operazioneCompletata'),
      messaggioErrorePredefinito: () => traduci.current('errori.generico.titolo'),
    });
  }, [mostra]);

  return (
    <>
      {children}
      {avviso ? (
        <AvvisoInSovrimpressione
          key={avviso.id}
          avviso={avviso}
          onChiudi={() => setAvviso(null)}
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
  onChiudi: () => void;
}) {
  const tema = useTema();
  const bordi = useSafeAreaInsets();
  const animazione = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(animazione, {
      toValue: 1,
      useNativeDriver: true,
      damping: 18,
      stiffness: 180,
    }).start();

    const timer = setTimeout(() => {
      Animated.timing(animazione, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }).start(onChiudi);
    }, DURATA_MS);

    return () => clearTimeout(timer);
  }, [animazione, onChiudi]);

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

  return (
    <Animated.View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        top: bordi.top + tema.spaziatura[2],
        left: tema.spaziatura[4],
        right: tema.spaziatura[4],
        opacity: animazione,
        transform: [
          { translateY: animazione.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) },
        ],
      }}
    >
      <Pressable
        onPress={onChiudi}
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
