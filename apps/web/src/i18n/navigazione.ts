import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

/**
 * Navigazione consapevole della lingua: usare SEMPRE questi al posto di
 * `next/link` e `next/navigation`, altrimenti i collegamenti perdono il
 * prefisso di lingua e l'utente viene sbalzato su un'altra versione del sito.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
