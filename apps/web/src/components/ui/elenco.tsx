import type { ElementType, ReactNode } from 'react';
import type { Tinta } from '@prome/design-tokens';
import type { Segnaposto } from '@/lib/segnaposto';
import { Card } from './card';
import { Chip } from './chip';
import { Icona, type NomeIcona } from './icona';
import { cn } from '@/lib/utils';

const SFONDO_TINTA: Record<'neutra' | Tinta, string> = {
  neutra: 'bg-tinta-neutra text-tinta-neutra-testo',
  menta: 'bg-tinta-menta text-tinta-menta-testo',
  ambra: 'bg-tinta-ambra text-tinta-ambra-testo',
  rosa: 'bg-tinta-rosa text-tinta-rosa-testo',
  blu: 'bg-tinta-blu text-tinta-blu-testo',
  verde: 'bg-tinta-verde text-tinta-verde-testo',
};

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
  /** Rosso su etichetta e freccia: eliminare un account non è «un'altra riga». */
  distruttiva?: boolean;
  /**
   * Debito dichiarato: spegne la riga e mostra «Presto» al posto del valore.
   *
   * Vedi `lib/segnaposto.ts`. Serve a disegnare la struttura intera senza che
   * una riga inerte somigli a una che funziona.
   */
  presto?: Segnaposto;
  /** Etichetta della pastiglia «Presto», dal catalogo i18n. */
  etichettaPresto?: string;
  /** Riga della pagina corrente in un indice di navigazione. */
  attiva?: boolean;
  className?: string;
}

/**
 * Righe raccolte in una superficie sola.
 *
 * **Il divisorio lo mette l'elenco, non la riga.** Sul web era rifatto a mano
 * in tre punti — le due righe della sessione, i bloccati, gli allegati — e ogni
 * volta bisognava ricordarsi quale fosse l'ultima. Qui la riga non lo sa e non
 * deve saperlo. È il gemello di `Elenco` sul telefono, con le stesse props.
 */
export function Elenco({
  children,
  className,
  senzaBordo = false,
}: {
  children: ReactNode;
  className?: string;
  /** Righe nude, per un indice dentro una colonna che ha già la sua cornice. */
  senzaBordo?: boolean;
}) {
  if (senzaBordo) return <div className={cn('flex flex-col', className)}>{children}</div>;

  return (
    <Card padding="nessuno" className={cn('overflow-hidden [&>*+*]:border-t', className)}>
      {children}
    </Card>
  );
}

/**
 * Una riga dell'elenco.
 *
 * `come` segue la convenzione di `Card`: chi vuole una riga che naviga passa
 * il `Link` tradotto e il suo `href`, perché `ui/` non conosce l'instradamento
 * delle lingue e un'ancora grezza perderebbe il prefisso. Senza `come` e senza
 * `onPress` la riga è testo.
 */
export function RigaElenco({
  etichetta,
  sottotitolo,
  valore,
  icona,
  tinta = 'neutra',
  guida,
  coda,
  distruttiva = false,
  presto,
  etichettaPresto = 'Presto',
  attiva = false,
  className,
  come,
  onPress,
  ...resto
}: RigaElencoProps & {
  come?: ElementType;
  onPress?: () => void;
  [altro: string]: unknown;
}) {
  const spenta = Boolean(presto);
  const premibile = !spenta && (Boolean(come) || Boolean(onPress));

  const contenuto = (
    <>
      {guida ??
        (icona ? (
          <span
            aria-hidden
            className={cn(
              'grid size-9 flex-none place-items-center rounded-xl',
              distruttiva ? 'bg-tinta-rosa text-tinta-rosa-testo' : SFONDO_TINTA[tinta],
            )}
          >
            <Icona nome={icona} dimensione={19} />
          </span>
        ) : null)}

      <span className="min-w-0 flex-1">
        <span
          className={cn(
            'block truncate text-[13.5px] font-bold',
            distruttiva ? 'text-errore' : attiva ? 'text-primario-accento' : 'text-testo',
          )}
        >
          {etichetta}
        </span>
        {sottotitolo ? (
          <span className="mt-0.5 block truncate text-[11.5px] leading-snug text-testo-tenue">
            {sottotitolo}
          </span>
        ) : null}
      </span>

      {presto ? (
        <Chip tono="ambra" dimensione="sm">
          {etichettaPresto}
        </Chip>
      ) : valore ? (
        <span className="flex-none text-[11.5px] font-extrabold text-testo-tenue">{valore}</span>
      ) : null}

      {coda}
    </>
  );

  const classi = cn(
    'flex w-full items-center gap-3 border-superficie-alt-2 px-4 py-3 text-left transition-colors',
    premibile && !attiva && 'hover:bg-superficie-alt',
    attiva && 'bg-tinta-menta-velo',
    spenta && 'opacity-55',
    className,
  );

  if (spenta || !premibile) {
    return (
      <div className={classi} aria-disabled={spenta || undefined}>
        {contenuto}
      </div>
    );
  }

  const Elemento = (come ?? 'button') as ElementType;

  return (
    <Elemento
      {...resto}
      {...(come ? { 'aria-current': attiva ? 'page' : undefined } : { type: 'button', onClick: onPress })}
      className={classi}
    >
      {contenuto}
    </Elemento>
  );
}
