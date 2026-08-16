import { Children, type ReactNode } from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';
import type { Tinta } from '@prome/design-tokens';
import { useTema } from '@/theme';
import { useT } from '@/i18n/i18n-provider';
import type { Segnaposto } from '@/lib/segnaposto';
import { Card } from './card';
import { Chip } from './chip';
import { Icona, type NomeIcona } from './icona';
import { Text } from './text';

export interface RigaElencoProps {
  etichetta: string;
  /** Riga di contesto sotto l'etichetta: cosa c'è dietro, o perché. */
  sottotitolo?: string;
  /**
   * Il valore corrente, a destra.
   *
   * È ciò che rende un indice migliore di una lista di controlli: quasi sempre
   * chi apre le impostazioni vuole verificare, non cambiare, e se il valore si
   * legge qui non apre niente.
   */
  valore?: string;
  /** Icona dentro il quadrello a sinistra. */
  icona?: NomeIcona;
  /** Tinta del quadrello. Sempre una tinta del tema, mai un colore. */
  tinta?: 'neutra' | Tinta;
  /** Al posto del quadrello: un avatar, un numero, una miniatura. */
  guida?: ReactNode;
  /** Al posto di valore e freccia: un interruttore, un bottone, una spunta. */
  coda?: ReactNode;
  /** Se c'è, la riga porta altrove: disegna la freccia ed è premibile. */
  onPress?: () => void;
  /** Rosso su etichetta e freccia: eliminare un account non è «un'altra riga». */
  distruttiva?: boolean;
  disabilitato?: boolean;
  /**
   * Debito dichiarato: spegne la riga e mostra «Presto» al posto del valore.
   *
   * Vedi `lib/segnaposto.ts`. Serve a disegnare la struttura intera senza che
   * una riga inerte somigli a una che funziona.
   */
  presto?: Segnaposto;
  /** Scelta singola: cambia il ruolo di accessibilità e lo sfondo. */
  selezionata?: boolean;
}

/**
 * Righe raccolte in una superficie sola.
 *
 * **Il divisorio lo mette l'elenco, non la riga.** Era scritto a mano in tre
 * punti come `ultima={indice === righe.length - 1}`, e ogni volta che se ne
 * aggiungeva una bisognava ricordarsene: qui la riga non sa di essere l'ultima
 * e non deve saperlo.
 */
export function Elenco({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const tema = useTema();
  const righe = Children.toArray(children).filter(Boolean);

  return (
    <Card style={{ padding: 0, gap: 0, overflow: 'hidden', ...style }}>
      {righe.map((riga, indice) => (
        <View
          key={indice}
          style={
            indice === righe.length - 1
              ? undefined
              : { borderBottomWidth: 1, borderBottomColor: tema.colori.superficieAlt2 }
          }
        >
          {riga}
        </View>
      ))}
    </Card>
  );
}

/**
 * Il titoletto sopra un elenco.
 *
 * Sta accanto all'elenco e non nella tipografia generale perché è sempre la
 * stessa cosa: l'etichetta che spezza una colonna lunga in gruppi corti, ed è
 * quello che fa crollare la lunghezza percepita anche quando le voci totali
 * sono aumentate.
 */
export function TitoloSezione({ children }: { children: string }) {
  const tema = useTema();

  return (
    <Text
      variante="didascalia"
      style={{
        fontSize: 10.5,
        fontWeight: tema.tipografia.peso.extra,
        color: tema.colori.testoDebole,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        marginTop: tema.spaziatura[2],
        marginLeft: tema.spaziatura[1],
      }}
    >
      {children}
    </Text>
  );
}

export function RigaElenco({
  etichetta,
  sottotitolo,
  valore,
  icona,
  tinta = 'neutra',
  guida,
  coda,
  onPress,
  distruttiva = false,
  disabilitato = false,
  presto,
  selezionata,
}: RigaElencoProps) {
  const tema = useTema();
  const t = useT();

  // Un segnaposto non è premibile e non è un dato: perde la freccia, che
  // prometterebbe una destinazione, e il valore, che sarebbe inventato.
  const spenta = disabilitato || Boolean(presto);
  const premibile = Boolean(onPress) && !spenta;
  const coppia = tema.tinte[tinta === 'neutra' ? 'neutra' : tinta];

  const contenuto = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: tema.spaziatura[3],
        paddingHorizontal: tema.spaziatura[4],
        paddingVertical: tema.spaziatura[3],
        minHeight: 56,
        backgroundColor: selezionata ? tema.colori.primarioTenue : undefined,
        opacity: spenta ? 0.55 : 1,
      }}
    >
      {guida ??
        (icona ? (
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: tema.raggio.md,
              backgroundColor: distruttiva ? tema.colori.erroreTenue : coppia.sfondo,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Il tratto prende il colore della tinta, che sul tema scuro è
                già un altro valore: così il quadrello si spegne da solo. */}
            {distruttiva ? (
              <Icona nome={icona} dimensione={19} colore="errore" />
            ) : (
              <Icona nome={icona} dimensione={19} tinta={tinta} />
            )}
          </View>
        ) : null)}

      <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
        <Text
          variante="corpo"
          numberOfLines={2}
          style={{
            fontSize: 14.5,
            fontWeight: tema.tipografia.peso.grassetto,
            color: distruttiva ? tema.colori.errore : tema.colori.testo,
          }}
        >
          {etichetta}
        </Text>
        {sottotitolo ? (
          <Text variante="didascalia" numberOfLines={2}>
            {sottotitolo}
          </Text>
        ) : null}
      </View>

      {presto ? <Chip tono="ambra">{t('comune.presto')}</Chip> : null}

      {!presto && valore ? (
        <Text
          variante="didascalia"
          numberOfLines={1}
          style={{ fontWeight: tema.tipografia.peso.extra, maxWidth: 140 }}
        >
          {valore}
        </Text>
      ) : null}

      {coda}

      {premibile ? (
        <Icona nome="avanti" dimensione={18} colore={distruttiva ? 'errore' : 'debole'} />
      ) : null}
    </View>
  );

  if (!premibile) {
    // `accessible` raggruppa il sottoalbero in un elemento solo, e con un
    // interruttore o un bottone dentro lo renderebbe irraggiungibile a chi usa
    // il lettore di schermo: si raggruppa **solo** quando la riga è testo.
    return coda ? (
      <View>{contenuto}</View>
    ) : (
      <View accessible accessibilityState={{ disabled: spenta }}>
        {contenuto}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole={selezionata === undefined ? 'button' : 'radio'}
      accessibilityLabel={etichetta}
      accessibilityHint={sottotitolo}
      accessibilityState={{ disabled: false, selected: selezionata }}
      onPress={onPress}
      style={({ pressed }) => (pressed ? { backgroundColor: tema.colori.superficieAlt } : null)}
    >
      {contenuto}
    </Pressable>
  );
}
