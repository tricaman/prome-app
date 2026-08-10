import type { ReactNode } from 'react';

/**
 * Radice tecnica dell'applicazione.
 *
 * `<html>` e `<body>` li scrive il layout di lingua, che è l'unico a sapere
 * quale lingua dichiarare nell'attributo `lang`. Questo file esiste perché
 * Next richiede una radice e perché `global-error.tsx` possa agganciarsi.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
