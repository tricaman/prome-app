import { cn } from '@/lib/utils';

/**
 * Tinte di riempimento finché non ci sono immagini reali.
 *
 * Sono riempimenti decorativi, non tinte semantiche: restano gli stessi nel
 * tema chiaro e in quello scuro, come nel disegno, e per questo le iniziali
 * sopra sono sempre scure.
 */
const TINTE = [
  'bg-riempimento-1',
  'bg-riempimento-2',
  'bg-riempimento-3',
  'bg-riempimento-4',
  'bg-riempimento-5',
] as const;

/** Sempre lo stesso colore per la stessa persona: cambia solo se cambia il nome. */
function tintaDi(seme: string): string {
  let somma = 0;
  for (let i = 0; i < seme.length; i += 1) somma += seme.charCodeAt(i);
  return TINTE[somma % TINTE.length]!;
}

export interface AvatarProps {
  /** Nome della persona: dà il colore e le iniziali, e resta il testo alternativo. */
  nome: string;
  dimensione?: number;
  /** Nasconde le iniziali: per i gruppi decorativi di avatar. */
  soloColore?: boolean;
  className?: string;
}

/**
 * Ritratto di una persona.
 *
 * Finché non ci sono immagini reali mostra le iniziali su una tinta derivata
 * dal nome: riconoscibile e stabile, senza il grigio anonimo di un segnaposto.
 */
export function Avatar({ nome, dimensione = 38, soloColore = false, className }: AvatarProps) {
  const iniziali = nome
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() ?? '')
    .join('');

  // Un avatar senza iniziali è decorazione: non ha un nome da annunciare, e
  // metterlo comunque nel documento significherebbe scrivere in pagina persone
  // che non ci sono.
  if (soloColore) {
    return (
      <span
        aria-hidden
        style={{ width: dimensione, height: dimensione }}
        className={cn('inline-block flex-none rounded-full', tintaDi(nome), className)}
      />
    );
  }

  return (
    <span
      style={{ width: dimensione, height: dimensione, fontSize: dimensione * 0.36 }}
      className={cn(
        'inline-grid flex-none place-items-center rounded-full font-extrabold text-riempimento-testo select-none',
        tintaDi(nome),
        className,
      )}
    >
      <span aria-hidden>{iniziali}</span>
      <span className="sr-only">{nome}</span>
    </span>
  );
}

export interface AvatarParlanteProps {
  nome: string;
  dimensione?: number;
  /** Nasconde le iniziali: per i gruppi decorativi di avatar. */
  soloColore?: boolean;
  /** Fa pulsare il riempimento: la persona sta parlando proprio ora. */
  pulsa?: boolean;
  className?: string;
}

/**
 * Avatar di chi sta parlando: il ritratto con l'anello del marchio intorno.
 *
 * L'anello sta su un contenitore quadrato di misura esplicita: ancorato a un
 * contenitore senza misura prenderebbe l'altezza della riga di testo — più
 * alta dell'avatar per lo spazio dei discendenti — e verrebbe ovale.
 */
export function AvatarParlante({
  nome,
  dimensione = 38,
  soloColore = false,
  pulsa = false,
  className,
}: AvatarParlanteProps) {
  // Sugli avatar grandi un tratto da 2px si perde: l'anello cresce con loro.
  const spessore = dimensione >= 40 ? 2.5 : 2;

  return (
    <span
      style={{ width: dimensione, height: dimensione }}
      className={cn('relative flex flex-none', className)}
    >
      <Avatar
        nome={nome}
        dimensione={dimensione}
        soloColore={soloColore}
        className={cn(pulsa && 'animate-pulse')}
      />
      <span
        aria-hidden
        style={{ borderWidth: spessore }}
        className="absolute -inset-0.75 rounded-full border-primary-500"
      />
    </span>
  );
}

export interface AvatarGroupProps {
  nomi: readonly string[];
  dimensione?: number;
  className?: string;
}

/** Avatar sovrapposti: quante persone ci sono, non chi sono. */
export function AvatarGroup({ nomi, dimensione = 30, className }: AvatarGroupProps) {
  return (
    <span className={cn('flex flex-none', className)}>
      {nomi.map((nome, indice) => (
        <Avatar
          key={nome}
          nome={nome}
          dimensione={dimensione}
          soloColore
          className={cn(
            'ring-[2.5px] ring-superficie',
            indice > 0 && '-ml-[11px]',
          )}
        />
      ))}
    </span>
  );
}
