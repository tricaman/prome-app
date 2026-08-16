import type { ReactNode } from 'react';
import { Heading } from '@/components/ui';

/**
 * Il capo di una sezione delle impostazioni.
 *
 * Titolo e una riga che dice cosa si decide qui. La riga non è decorazione: le
 * sezioni sono diventate sette, e chi ci arriva da un collegamento deve capire
 * dov'è senza guardare l'indice.
 */
export function TestataPannello({ titolo, sommario }: { titolo: string; sommario: ReactNode }) {
  return (
    <div className="mb-6">
      <Heading livello={1} taglia="xl">
        {titolo}
      </Heading>
      <p className="mt-1.5 text-[14px] leading-relaxed text-testo-tenue">{sommario}</p>
    </div>
  );
}
