import clsx, { type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Unisce classi condizionali risolvendo i conflitti Tailwind: l'ultima vince.
 * Serve a far sì che una classe passata dall'esterno possa davvero
 * sovrascrivere quella predefinita di un componente.
 */
export function cn(...classi: ClassValue[]): string {
  return twMerge(clsx(classi));
}
