import type { Lingua } from '@prome/i18n';
import type { Guida } from '@/content';
import { config } from './config';
import { urlAssoluto } from './seo';

/**
 * Costruttori dei dati strutturati (schema.org).
 *
 * Ogni tipo di pagina dichiara cosa è, in un formato che i motori di ricerca
 * sanno leggere. Qui ci sono solo i tipi che servono alle pagine del sito:
 * organizzazione, sito, briciole, articoli e atenei. Non c'è nulla per aule
 * studio, post o profili, perché quei contenuti non hanno pagine pubbliche.
 */

export type OggettoSchema = Record<string, unknown>;

const idOrganizzazione = `${config.urlSito}#organizzazione`;

export const organizzazione = (descrizione: string): OggettoSchema => ({
  '@type': 'Organization',
  '@id': idOrganizzazione,
  name: config.nome,
  url: config.urlSito,
  description: descrizione,
});

export const sitoWeb = (lingua: Lingua, nome: string, descrizione: string): OggettoSchema => ({
  '@type': 'WebSite',
  '@id': `${config.urlSito}#sito`,
  name: nome,
  url: urlAssoluto(lingua, '/'),
  description: descrizione,
  inLanguage: lingua,
  publisher: { '@id': idOrganizzazione },
});

/** Percorso di navigazione: lo stesso mostrato in pagina dalle briciole. */
export const briciole = (
  lingua: Lingua,
  voci: readonly { etichetta: string; href?: string }[],
): OggettoSchema => ({
  '@type': 'BreadcrumbList',
  itemListElement: voci.map((voce, indice) => ({
    '@type': 'ListItem',
    position: indice + 1,
    name: voce.etichetta,
    ...(voce.href ? { item: urlAssoluto(lingua, voce.href) } : {}),
  })),
});
/**
 * Pagina che raccoglie una lista.
 *
 * Gli elementi sono sempre nostre pagine — atenei, argomenti, guide — mai
 * contenuti pubblicati dagli utenti.
 */
export const raccolta = (
  lingua: Lingua,
  percorso: string,
  nome: string,
  descrizione: string,
  elementi: readonly { nome: string; percorso: string }[],
): OggettoSchema => ({
  '@type': 'CollectionPage',
  url: urlAssoluto(lingua, percorso),
  name: nome,
  description: descrizione,
  mainEntity: {
    '@type': 'ItemList',
    itemListElement: elementi.map((elemento, indice) => ({
      '@type': 'ListItem',
      position: indice + 1,
      name: elemento.nome,
      url: urlAssoluto(lingua, elemento.percorso),
    })),
  },
});



export const articolo = (lingua: Lingua, guida: Guida, percorso: string): OggettoSchema => ({
  '@type': 'BlogPosting',
  headline: guida.titolo,
  description: guida.sommario,
  url: urlAssoluto(lingua, percorso),
  datePublished: guida.dataIso,
  author: { '@type': 'Organization', name: guida.autore },
  publisher: { '@id': idOrganizzazione },
  timeRequired: `PT${guida.minutiLettura}M`,
});

export const organizzazioneEducativa = (
  lingua: Lingua,
  nome: string,
  citta: string,
  percorso: string,
): OggettoSchema => ({
  '@type': 'EducationalOrganization',
  name: nome,
  address: { '@type': 'PostalAddress', addressLocality: citta, addressCountry: 'IT' },
  url: urlAssoluto(lingua, percorso),
});
