import { Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { useTema } from '@/theme';
import type { VarianteTesto } from '@/theme';

export interface TextProps extends RNTextProps {
  /** Ruolo del testo nella gerarchia, non la sua dimensione. */
  variante?: VarianteTesto;
  /**
   * Colore semantico; se assente lo decide la variante.
   *
   * `primario` è il menta pieno, che sullo sfondo della pagina non regge: per
   * il testo del marchio — titoletti, valori, «Salva» — c'è `accento`, che sul
   * chiaro è scurito e sullo scuro è il menta stesso.
   */
  colore?: 'testo' | 'corpo' | 'tenue' | 'debole' | 'primario' | 'accento' | 'errore' | 'successo';
  allineamento?: 'left' | 'center' | 'right';
}

/**
 * Testo dell'app.
 *
 * Usare sempre questo al posto del testo grezzo: garantisce che dimensioni,
 * pesi e colori vengano dal tema, quindi che l'app resti leggibile anche in
 * tema scuro e coerente da una schermata all'altra.
 */
export function Text({
  variante = 'corpo',
  colore,
  allineamento,
  style,
  ...props
}: TextProps) {
  const tema = useTema();

  const colori = {
    testo: tema.colori.testo,
    corpo: tema.colori.testoCorpo,
    tenue: tema.colori.testoTenue,
    debole: tema.colori.testoDebole,
    primario: tema.colori.primario,
    accento: tema.colori.primarioAccento,
    errore: tema.colori.errore,
    successo: tema.colori.successo,
  };

  return (
    <RNText
      {...props}
      style={[
        tema.testo[variante],
        colore ? { color: colori[colore] } : null,
        allineamento ? { textAlign: allineamento } : null,
        style,
      ]}
    />
  );
}
