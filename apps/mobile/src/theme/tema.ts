import {
  ombra,
  raggio,
  spaziatura,
  temaChiaro,
  temaScuro,
  tinte,
  tinteScure,
  tipografia,
} from '@prome/design-tokens';
import type { CoppiaTinta, Tema, Tinta } from '@prome/design-tokens';
import { Platform, type TextStyle, type ViewStyle } from 'react-native';

/**
 * Tema dell'app mobile: gli stessi token del web, tradotti nelle unità che
 * React Native capisce (numeri invece di stringhe CSS, ombre native).
 *
 * Cambiando un colore nel pacchetto dei token cambiano insieme le due app: è
 * la ragione per cui qui non compare nemmeno un valore esadecimale.
 */
export interface TemaMobile {
  colori: Tema;
  /**
   * Le tinte decorative del tema in corso. Passano di qui e non
   * dall'importazione diretta: sul fondo scuro le stesse tinte hanno sfondo e
   * testo diversi, e un componente che le importasse da sé resterebbe pastello
   * anche di notte.
   */
  tinte: Record<Tinta, CoppiaTinta>;
  spaziatura: typeof spaziatura;
  raggio: typeof raggio;
  tipografia: typeof tipografia;
  /** Ombre già pronte da applicare a una `View`. */
  ombra: Record<keyof typeof ombra, ViewStyle>;
  /** Stili di testo predefiniti, dal titolo alla didascalia. */
  testo: Record<VarianteTesto, TextStyle>;
  eScuro: boolean;
}

export type VarianteTesto =
  | 'titoloGrande'
  | 'titolo'
  | 'sottotitolo'
  | 'corpo'
  | 'corpoTenue'
  | 'etichetta'
  | 'didascalia';

const ombreNative = (coloreOmbra: string): Record<keyof typeof ombra, ViewStyle> =>
  Object.fromEntries(
    Object.entries(ombra).map(([nome, valore]) => [
      nome,
      Platform.select<ViewStyle>({
        ios: {
          shadowColor: coloreOmbra,
          shadowOpacity: valore.nativa.opacity,
          shadowRadius: valore.nativa.radius,
          shadowOffset: { width: 0, height: valore.nativa.offsetY },
        },
        // Su Android l'ombra è una sola proprietà: la profondità.
        android: { elevation: valore.nativa.elevation },
        default: {},
      }) as ViewStyle,
    ]),
  ) as Record<keyof typeof ombra, ViewStyle>;

const stiliTesto = (colori: Tema): Record<VarianteTesto, TextStyle> => ({
  titoloGrande: {
    fontSize: tipografia.dimensione['4xl'],
    lineHeight: tipografia.interlinea['4xl'],
    fontWeight: tipografia.peso.extra,
    color: colori.testo,
    letterSpacing: -0.5,
  },
  titolo: {
    fontSize: tipografia.dimensione['2xl'],
    lineHeight: tipografia.interlinea['2xl'],
    fontWeight: tipografia.peso.grassetto,
    color: colori.testo,
  },
  sottotitolo: {
    fontSize: tipografia.dimensione.lg,
    lineHeight: tipografia.interlinea.lg,
    fontWeight: tipografia.peso.semi,
    color: colori.testo,
  },
  corpo: {
    fontSize: tipografia.dimensione.base,
    lineHeight: tipografia.interlinea.base,
    fontWeight: tipografia.peso.normale,
    color: colori.testo,
  },
  corpoTenue: {
    fontSize: tipografia.dimensione.base,
    lineHeight: tipografia.interlinea.base,
    fontWeight: tipografia.peso.normale,
    color: colori.testoTenue,
  },
  etichetta: {
    fontSize: tipografia.dimensione.sm,
    lineHeight: tipografia.interlinea.sm,
    fontWeight: tipografia.peso.semi,
    color: colori.testo,
  },
  didascalia: {
    fontSize: tipografia.dimensione.xs,
    lineHeight: tipografia.interlinea.xs,
    fontWeight: tipografia.peso.normale,
    color: colori.testoTenue,
  },
});

const componiTema = (colori: Tema, eScuro: boolean): TemaMobile => ({
  colori,
  tinte: eScuro ? tinteScure : tinte,
  spaziatura,
  raggio,
  tipografia,
  ombra: ombreNative(eScuro ? '#000000' : colori.testo),
  testo: stiliTesto(colori),
  eScuro,
});

export const temaMobileChiaro = componiTema(temaChiaro, false);
export const temaMobileScuro = componiTema(temaScuro, true);
