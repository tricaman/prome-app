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
  /**
   * Riga di contesto **sopra** al titolo: il saluto della bacheca, una
   * sezione di provenienza. Sta sopra perché il titolo resti l'ultima cosa
   * letta prima del contenuto.
   */
  sopraTitolo?: string;
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
  /**
   * Con `true` il titolo sta alla stessa altezza comunque vada: lo spazio
   * della riga di contesto è riservato anche quando non c'è, e le azioni si
   * centrano nella riga invece di allungarla.
   *
   * Serve dove le intestazioni si confrontano fra loro — le quattro schede.
   * Senza, il titolo stava a tre altezze diverse a seconda di cosa gli
   * cresceva intorno: sedici punti più in basso dove c'era il saluto, dieci
   * dove c'era un'icona, in cima dove non c'era né l'uno né l'altra. Il
   * confronto non è teorico, è il salto che si vede passando da una scheda
   * all'altra.
   */
  altezzaCostante?: boolean;
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
  sopraTitolo,
  conIndietro = false,
  onIndietro,
  azioni,
  conAreaSicura = true,
  altezzaCostante = false,
}: IntestazioneProps) {
  const tema = useTema();
  const bordi = useSafeAreaInsets();
  const t = useT();

  // La riga di contesto occupa una riga di didascalia, il titolo una riga di
  // titolo: sono le due misure che tengono ferma l'altezza.
  const altezzaSopraTitolo = tema.testo.didascalia.lineHeight ?? 0;
  const altezzaTitolo = tema.testo.titolo.lineHeight ?? 0;

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
        <View
          style={[
            { flexDirection: 'row', alignItems: 'flex-end', gap: tema.spaziatura[3] },
            altezzaCostante && { minHeight: altezzaSopraTitolo + altezzaTitolo },
          ]}
        >
          <View style={{ flex: 1, minWidth: 0 }}>
            {/* Lo spazio della riga di contesto si riserva anche vuoto: è ciò
                che tiene il titolo dov'era nella scheda precedente. */}
            {altezzaCostante || sopraTitolo ? (
              <View style={{ height: altezzaSopraTitolo, justifyContent: 'flex-end' }}>
                {sopraTitolo ? (
                  <Text variante="didascalia" numberOfLines={1}>
                    {sopraTitolo}
                  </Text>
                ) : null}
              </View>
            ) : null}
            {titolo ? <Text variante="titolo">{titolo}</Text> : null}
          </View>
          {azioni ? (
            // Centrate nella riga, non appoggiate in fondo: appoggiandosi
            // allungavano la riga e portavano giù il titolo con sé.
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                alignSelf: altezzaCostante ? 'center' : 'flex-end',
                gap: tema.spaziatura[2],
              }}
            >
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
  conteggio,
  disabilitato = false,
  onPress,
}: {
  icona: Parameters<typeof Icona>[0]['nome'];
  etichetta: string;
  conPallino?: boolean;
  /**
   * Il numero nella bolla: quante cose aspettano dietro il bottone. Zero non
   * disegna nulla — un badge a zero è un pallino che grida per niente. Sopra
   * il 9 dice «9+»: a quel punto il numero esatto non cambia la decisione.
   */
  conteggio?: number;
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
      {conteggio !== undefined && conteggio > 0 ? (
        <View
          style={{
            position: 'absolute',
            top: -3,
            right: -3,
            minWidth: 18,
            height: 18,
            paddingHorizontal: 4,
            borderRadius: tema.raggio.full,
            backgroundColor: tema.colori.avviso,
            borderWidth: 2,
            borderColor: tema.colori.superficie,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={{
              fontSize: 9.5,
              lineHeight: 12,
              fontWeight: tema.tipografia.peso.extra,
              color: tema.colori.avvisoTesto,
            }}
          >
            {conteggio > 9 ? '9+' : conteggio}
          </Text>
        </View>
      ) : conPallino ? (
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
