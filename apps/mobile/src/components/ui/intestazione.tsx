import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTema } from '@/theme';
import { useT } from '@/i18n/i18n-provider';
import { Icona } from './icona';
import { Text } from './text';

export interface IntestazioneProps {
  titolo?: string;
  /** Riga di contesto sotto al titolo. */
  sottotitolo?: string;
  /** Mostra il tasto indietro: da usare su ogni schermata impilata. */
  conIndietro?: boolean;
  /**
   * Cosa fa il tasto indietro. Senza, torna alla schermata precedente.
   *
   * Serve a chi deve chiedere qualcosa prima di lasciare andare — un modulo
   * compilato a metà — e va sempre insieme al tasto di sistema e al gesto,
   * altrimenti è un blocco che si aggira scivolando col pollice.
   */
  onIndietro?: () => void;
  /** Contenuto a destra: azioni della schermata. */
  azioni?: ReactNode;
  /** Con `false` non aggiunge il margine per la barra di stato. */
  conAreaSicura?: boolean;
}

/**
 * Intestazione di una schermata.
 *
 * Sostituisce l'header di sistema perché le schermate hanno bisogno di un
 * titolo grande, di un sottotitolo e di azioni proprie; il tasto indietro è
 * un cerchio ampio, che su un telefono si prende con il pollice.
 */
export function Intestazione({
  titolo,
  sottotitolo,
  conIndietro = false,
  onIndietro,
  azioni,
  conAreaSicura = true,
}: IntestazioneProps) {
  const tema = useTema();
  const bordi = useSafeAreaInsets();
  const t = useT();

  return (
    <View
      style={{
        paddingTop: conAreaSicura ? bordi.top + tema.spaziatura[2] : tema.spaziatura[2],
        paddingHorizontal: tema.spaziatura[5],
        paddingBottom: tema.spaziatura[3],
        gap: tema.spaziatura[3],
        backgroundColor: tema.colori.sfondo,
      }}
    >
      {conIndietro ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('comune.indietro')}
          onPress={onIndietro ?? (() => router.back())}
          style={{
            width: 40,
            height: 40,
            borderRadius: tema.raggio.full,
            backgroundColor: tema.colori.superficieAlt2,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icona nome="indietro" colore="testo" />
        </Pressable>
      ) : null}

      {titolo || azioni ? (
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: tema.spaziatura[3] }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            {sottotitolo ? <Text variante="didascalia">{sottotitolo}</Text> : null}
            {titolo ? <Text variante="titolo">{titolo}</Text> : null}
          </View>
          {azioni ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: tema.spaziatura[2] }}>
              {azioni}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

/** Bottone circolare da intestazione: notifiche, opzioni, chiusura. */
export function AzioneTonda({
  icona,
  etichetta,
  conPallino = false,
  disabilitato = false,
  onPress,
}: {
  icona: Parameters<typeof Icona>[0]['nome'];
  etichetta: string;
  conPallino?: boolean;
  disabilitato?: boolean;
  onPress?: () => void;
}) {
  const tema = useTema();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etichetta}
      accessibilityState={{ disabled: disabilitato }}
      disabled={disabilitato}
      onPress={onPress}
      style={[
        {
          width: 42,
          height: 42,
          borderRadius: tema.raggio.full,
          backgroundColor: tema.colori.superficie,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabilitato ? 0.45 : 1,
        },
        tema.ombra.sm,
      ]}
    >
      <Icona nome={icona} dimensione={21} colore="testo" />
      {conPallino ? (
        <View
          style={{
            position: 'absolute',
            top: 9,
            right: 9,
            width: 9,
            height: 9,
            borderRadius: tema.raggio.full,
            backgroundColor: tema.colori.avviso,
            borderWidth: 2,
            borderColor: tema.colori.superficie,
          }}
        />
      ) : null}
    </Pressable>
  );
}
