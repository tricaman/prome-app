import type { Allegato } from '@/content';
import { Card } from '@/components/ui';
import { cn } from '@/lib/utils';
import { numero, SIGLA_ALLEGATO, TONO_ALLEGATO } from './presentazione';

const SFONDI = {
  rosa: 'bg-tinta-rosa text-tinta-rosa-testo',
  blu: 'bg-tinta-blu text-tinta-blu-testo',
  menta: 'bg-tinta-menta text-tinta-menta-testo',
  ambra: 'bg-tinta-ambra text-tinta-ambra-testo',
  verde: 'bg-tinta-verde text-tinta-verde-testo',
  neutro: 'bg-superficie-alt-2 text-testo-tenue',
} as const;

/** Targhetta del tipo di file: si riconosce di colpo, anche di sbieco. */
export function TarghettaAllegato({
  tipo,
  className,
}: {
  tipo: Allegato['tipo'];
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        'grid flex-none place-items-center rounded-lg text-[8.5px] font-extrabold',
        SFONDI[TONO_ALLEGATO[tipo]],
        className,
      )}
    >
      {SIGLA_ALLEGATO[tipo]}
    </span>
  );
}

export interface AllegatoRigaProps {
  allegato: Allegato;
  /** Riga secondaria: se assente si compone da chi ha caricato e dimensione. */
  dettaglio?: string;
  /** Numero di download mostrato a destra. */
  conDownload?: boolean;
  variante?: 'riquadro' | 'nuda';
  className?: string;
}

/** Materiale condiviso in forma di riga. */
export function AllegatoRiga({
  allegato,
  dettaglio,
  conDownload = false,
  variante = 'riquadro',
  className,
}: AllegatoRigaProps) {
  const sotto = dettaglio ?? `${allegato.caricatoDa} · ${allegato.dimensione}`;

  return (
    <div
      className={cn(
        'flex items-center gap-3',
        variante === 'riquadro' &&
          'rounded-[14px] border border-bordo bg-superficie-alt px-3.5 py-3',
        className,
      )}
    >
      <TarghettaAllegato tipo={allegato.tipo} className="h-[38px] w-8" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-extrabold text-testo">
          {allegato.nome}
        </span>
        <span className="mt-0.5 block truncate text-[11px] text-testo-didascalia">{sotto}</span>
      </span>
      {conDownload && allegato.download ? (
        <span className="flex-none text-xs font-bold text-testo-debole">
          {numero(allegato.download)}
        </span>
      ) : null}
    </div>
  );
}

/**
 * Allegato in evidenza dentro un post: è spesso il vero motivo della visita,
 * quindi occupa tutta la larghezza e porta l'azione di scarico.
 */
export function AllegatoInEvidenza({
  allegato,
  etichettaScarica,
  etichettaDownload,
}: {
  allegato: Allegato;
  etichettaScarica: string;
  etichettaDownload?: string;
}) {
  const dettagli = [allegato.dimensione, allegato.dettaglio, etichettaDownload]
    .filter(Boolean)
    .join(' · ');

  return (
    <Card variante="tenue" padding="nessuno" className="flex items-center gap-3.5 p-4">
      <TarghettaAllegato tipo={allegato.tipo} className="h-[52px] w-11 text-[10px]" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-extrabold text-testo">
          {allegato.nome}
        </span>
        <span className="mt-0.5 block text-[12.5px] text-testo-didascalia">{dettagli}</span>
      </span>
      <span className="flex-none rounded-full bg-primario px-5 py-2.5 text-[13.5px] font-extrabold text-primario-testo">
        {etichettaScarica}
      </span>
    </Card>
  );
}
