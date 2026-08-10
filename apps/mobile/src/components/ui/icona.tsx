import Svg, { Path } from 'react-native-svg';
import { TRACCIATI, type NomeIcona } from '@prome/design-tokens';
import { useTema } from '@/theme';

export type { NomeIcona };

export interface IconaProps {
  nome: NomeIcona;
  dimensione?: number;
  /** Colore semantico; se assente segue il testo secondario. */
  colore?: 'testo' | 'tenue' | 'debole' | 'primario' | 'primarioTesto' | 'errore' | 'bianco';
}

/**
 * Icona a tratto.
 *
 * I tracciati vivono nei token del design system: sito e app disegnano gli
 * stessi segni, e aggiungerne uno significa toccare i token, non due file.
 */
export function Icona({ nome, dimensione = 20, colore = 'tenue' }: IconaProps) {
  const tema = useTema();

  const colori = {
    testo: tema.colori.testo,
    tenue: tema.colori.testoTenue,
    debole: tema.colori.testoDebole,
    primario: tema.colori.primario,
    primarioTesto: tema.colori.primarioTesto,
    errore: tema.colori.errore,
    bianco: '#FFFFFF',
  };

  return (
    <Svg width={dimensione} height={dimensione} viewBox="0 0 24 24" fill="none">
      <Path
        d={TRACCIATI[nome]}
        stroke={colori[colore]}
        strokeWidth={1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
