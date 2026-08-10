import type { ComponentProps, ReactNode } from 'react';
import { buttonVariants } from '@heroui/react';
import { Link } from '@/i18n/navigazione';
import { cn } from '@/lib/utils';
import type { ButtonProps } from './button';

export interface ButtonLinkProps
  extends Omit<ComponentProps<typeof Link>, 'className' | 'children'> {
  variante?: ButtonProps['variante'];
  dimensione?: 'sm' | 'md' | 'lg';
  className?: string;
  children: ReactNode;
}

const VARIANTI = {
  primaria: 'primary',
  secondaria: 'secondary',
  tenue: 'tertiary',
  contorno: 'outline',
  fantasma: 'ghost',
  distruttiva: 'danger',
} as const;

/**
 * Collegamento con l'aspetto di un bottone.
 *
 * Resta un `<a>`: si può aprire in una nuova scheda, copiare l'indirizzo e i
 * motori di ricerca lo seguono — cose che un bottone non permette. Il
 * collegamento passa dalla navigazione tradotta, quindi conserva la lingua.
 */
export function ButtonLink({
  variante = 'primaria',
  dimensione = 'md',
  className,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      {...props}
      className={cn(
        buttonVariants({ variant: VARIANTI[variante], size: dimensione }),
        'rounded-full font-semibold no-underline',
        className,
      )}
    >
      {children}
    </Link>
  );
}
