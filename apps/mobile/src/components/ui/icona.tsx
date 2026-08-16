import Svg, { Path } from 'react-native-svg';
import { TRACCIATI, type NomeIcona, type Tinta } from '@prome/design-tokens';
import { useTema } from '@/theme';

export type { NomeIcona };

export interface IconaProps {
  nome: NomeIcona;
  dimensione?: number;
  /**
   * Colore della tinta decorativa, per le icone dentro un quadrello colorato.
   * Vince su `colore`: le tinte cambiano col tema da sé, quindi restano una
   * scelta del design system e non un colore scritto a mano.
   */
  tinta?: 'neutra' | Tinta;
  /** Colore semantico; se assente segue il testo secondario. */
  colore?:
    | 'testo'
    | 'tenue'
    | 'debole'
    | 'primario'
    | 'primarioTesto'
    | 'accento'
    | 'errore'
    | 'bianco';
}

/**
 * Icona a tratto.
 *
 * I tracciati vivono nei token del design system: sito e app disegnano gli
 * stessi segni, e aggiungerne uno significa toccare i token, non due file.
 */
export function Icona({ nome, dimensione = 20, colore = 'tenue', tinta }: IconaProps) {
  const tema = useTema();

  const colori = {
    testo: tema.colori.testo,
    tenue: tema.colori.testoTenue,
    debole: tema.colori.testoDebole,
    primario: tema.colori.primario,
    primarioTesto: tema.colori.primarioTesto,
    accento: tema.colori.primarioAccento,
    errore: tema.colori.errore,
    bianco: '#FFFFFF',
  };

  return (
    <Svg width={dimensione} height={dimensione} viewBox="0 0 24 24" fill="none">
      <Path
        d={TRACCIATI[nome]}
        stroke={tinta ? tema.tinte[tinta === 'neutra' ? 'neutra' : tinta].testo : colori[colore]}
        strokeWidth={1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
