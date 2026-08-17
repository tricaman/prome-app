'use client';

import type { ReactNode } from 'react';
import { Dropdown } from '@heroui/react';
import { Icona, type NomeIcona } from './icona';
import { cn } from '@/lib/utils';

export interface MenuProps {
  /** Cosa si preme per aprire: un avatar, un bottone, tre puntini. */
  innesco: ReactNode;
  /**
   * Come si chiama il menu per chi non vede l'innesco.
   *
   * Obbligatoria: l'innesco di un menu account è un ritratto, e «TD» letto ad
   * alta voce non dice cosa succede premendolo.
   */
  etichetta: string;
  /** Riga d'intestazione dentro il pannello, sopra le voci: chi sei, dove sei. */
  intestazione?: ReactNode;
  /** Da che lato si allinea al proprio innesco. */
  allineamento?: 'inizio' | 'fine';
  /** Stile dell'innesco: quello della libreria non ne ha uno di prodotto. */
  classNameInnesco?: string;
  children: ReactNode;
}

const ALLINEAMENTO = { inizio: 'bottom start', fine: 'bottom end' } as const;

/**
 * Menu a comparsa.
 *
 * È l'unico punto che conosce il menu della libreria: le schermate compongono
 * `Menu` e `VoceMenu` e non sanno cosa ci sia sotto. Le voci con `href` restano
 * collegamenti veri — si aprono in una scheda nuova, si copia l'indirizzo — e
 * passano dal router dell'applicazione (`InterfacciaProvider`), quindi
 * conservano il prefisso di lingua.
 *
 * Della libreria si tiene quasi tutto: fondo, ombra, animazione d'ingresso,
 * chiusura con Esc, ritorno del fuoco all'innesco, frecce da tastiera. Qui si
 * correggono solo i due punti in cui il suo disegno non è il nostro — il raggio
 * e il colore del passaggio del mouse, che di serie **scurisce** su fondo già
 * scuro invece di schiarire.
 */
export function Menu({
  innesco,
  etichetta,
  intestazione,
  allineamento = 'fine',
  classNameInnesco,
  children,
}: MenuProps) {
  return (
    <Dropdown>
      <Dropdown.Trigger
        aria-label={etichetta}
        className={cn(
          'cursor-pointer rounded-full outline-none transition-colors',
          'focus-visible:ring-2 focus-visible:ring-primario focus-visible:ring-offset-2 focus-visible:ring-offset-superficie',
          classNameInnesco,
        )}
      >
        {innesco}
      </Dropdown.Trigger>

      <Dropdown.Popover
        placement={ALLINEAMENTO[allineamento]}
        className="min-w-[232px] rounded-2xl border border-bordo"
      >
        {intestazione ? (
          <>
            <div className="px-3.5 pb-3 pt-3.5">{intestazione}</div>
            <div className="h-px bg-bordo" />
          </>
        ) : null}
        <Dropdown.Menu aria-label={etichetta}>{children}</Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}

export interface VoceMenuProps {
  etichetta: string;
  icona?: NomeIcona;
  /** Dove porta. Con `href` la voce è un collegamento, senza è un comando. */
  href?: string;
  /** Cosa fa, quando non porta da nessuna parte. */
  onSeleziona?: () => void;
  /** Rosso: per i gesti da cui non si torna indietro. */
  distruttiva?: boolean;
  disattivata?: boolean;
}

/** Una riga del menu: un collegamento (`href`) oppure un comando (`onSeleziona`). */
export function VoceMenu({
  etichetta,
  icona,
  href,
  onSeleziona,
  distruttiva = false,
  disattivata = false,
}: VoceMenuProps) {
  return (
    <Dropdown.Item
      href={href}
      onAction={onSeleziona}
      isDisabled={disattivata}
      textValue={etichetta}
      className={cn(
        'min-h-[38px] cursor-pointer gap-2.5 rounded-[10px] px-2.5 text-[13px] font-semibold',
        distruttiva ? 'text-errore' : 'text-testo-corpo',
        'data-[hovered=true]:bg-superficie-alt-2',
      )}
    >
      {icona ? <Icona nome={icona} dimensione={17} /> : null}
      {etichetta}
    </Dropdown.Item>
  );
}
