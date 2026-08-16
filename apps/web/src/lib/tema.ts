/**
 * Le costanti del tema, fuori dal modulo del provider.
 *
 * Stanno qui perché le legge anche il layout, che è un componente del server:
 * importarle da un file marcato `'use client'` non ne darebbe il valore ma un
 * riferimento al modulo del browser, e nello script finirebbe qualcosa che non
 * è una stringa.
 */

export type SceltaTema = 'system' | 'light' | 'dark';
export type TemaRisolto = 'light' | 'dark';

/**
 * Dove la scelta viene conservata. Il nome e i valori sono quelli che scriveva
 * `next-themes`: chi aveva già scelto un tema non deve rifarlo.
 */
export const CHIAVE_TEMA = 'theme';
export const QUERY_SISTEMA = '(prefers-color-scheme: dark)';

export function normalizzaScelta(valore: string | null | undefined): SceltaTema {
  return valore === 'light' || valore === 'dark' || valore === 'system' ? valore : 'system';
}

/**
 * Lo script che applica il tema **prima della prima pittura**.
 *
 * Deve arrivare dentro l'HTML e girare subito: se aspettasse React, chi ha
 * scelto lo scuro vedrebbe un lampo chiaro a ogni apertura. È in ES5 e avvolto
 * in un `try` perché gira prima di tutto il resto, in un browser che non
 * possiamo interrogare: se fallisse, non deve portarsi dietro la pagina.
 */
export const SCRIPT_TEMA = `(function(){try{var s=localStorage.getItem('${CHIAVE_TEMA}');var d=s==='dark'||(s!=='light'&&window.matchMedia('${QUERY_SISTEMA}').matches)?'dark':'light';var e=document.documentElement;e.classList.remove('light','dark');e.classList.add(d);e.style.colorScheme=d;}catch(e){}})();`;
