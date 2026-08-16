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
const idPersona = `${config.urlSito}#persona`;

/**
 * Chi ha fatto Prome.
 *
 * Un motore di ricerca ragiona per entità collegate, non per pagine sciolte:
 * finché il sito dichiara solo un'organizzazione, «Prome» resta un nome di
 * dominio. Dichiarare anche la persona, e legarla come fondatore e autore,
 * è ciò che permette ai due nomi di sostenersi a vicenda — ed è vero, che è
 * la sola ragione per cui si può scrivere.
 *
 * Il riferimento vive nel grafo di **ogni** pagina pubblica, con un `@id`
 * stabile, perché è la ripetizione dello stesso identificativo a far capire
 * che si parla sempre della stessa persona.
 *
 * Non è una `ProfilePage` e non lo diventerà: quelle descrivono profili di
 * utenti, che qui non hanno pagine pubbliche. Questa è la firma dell'editore.
 */
export const persona = (lingua: Lingua): OggettoSchema => ({
  '@type': 'Person',
  '@id': idPersona,
  name: config.autore.nome,
  jobTitle: config.autore.ruolo,
  url: urlAssoluto(lingua, '/chi-siamo'),
  address: {
    '@type': 'PostalAddress',
    addressLocality: config.autore.citta,
    addressCountry: config.autore.paese,
  },
  worksFor: { '@id': idOrganizzazione },
});

/**
 * Il marchio come lo vedono i motori di ricerca.
 *
 * È la versione PNG e non l'SVG perché Google accetta solo formati raster per
 * il logo di un'organizzazione: è l'immagine che può comparire accanto al
 * risultato di ricerca e nel pannello informativo.
 */
export const URL_LOGO = `${config.urlSito}/icona-512.png`;

export const organizzazione = (descrizione: string): OggettoSchema => ({
  '@type': 'Organization',
  '@id': idOrganizzazione,
  name: config.nome,
  url: config.urlSito,
  description: descrizione,
  logo: {
    '@type': 'ImageObject',
    url: URL_LOGO,
    width: 512,
    height: 512,
  },
  image: URL_LOGO,
  // Prome non è una società: dietro c'è una persona, e il piè di pagina di
  // ogni pagina lo dice a chi legge. Qui lo dice a chi indicizza.
  founder: { '@id': idPersona },
  address: {
    '@type': 'PostalAddress',
    addressLocality: config.autore.citta,
    addressCountry: config.autore.paese,
  },
});

export const sitoWeb = (lingua: Lingua, nome: string, descrizione: string): OggettoSchema => ({
  '@type': 'WebSite',
  '@id': `${config.urlSito}#sito`,
  name: nome,
  url: urlAssoluto(lingua, '/'),
  description: descrizione,
  inLanguage: lingua,
  publisher: { '@id': idOrganizzazione },
  creator: { '@id': idPersona },
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
  mainEntityOfPage: { '@type': 'WebPage', '@id': urlAssoluto(lingua, percorso) },
  datePublished: guida.dataIso,
  dateModified: guida.dataIso,
  inLanguage: lingua,
  // Una persona con un nome, non una «redazione»: per chi valuta un contenuto
  // — e per chi lo legge — un articolo firmato e uno anonimo non valgono
  // uguale. È lo stesso nome che compare in pagina sotto il titolo.
  author: { '@id': idPersona },
  publisher: { '@id': idOrganizzazione },
  timeRequired: `PT${guida.minutiLettura}M`,
});

/**
 * La pagina «Chi siamo», dichiarata per ciò che è: il posto dove la persona
 * dietro Prome viene descritta. È il legame che rende il `Person` del grafo
 * qualcosa di più di un nome — un'entità con una pagina che la spiega.
 */
export const paginaChiSiamo = (lingua: Lingua): OggettoSchema => ({
  '@type': 'AboutPage',
  url: urlAssoluto(lingua, '/chi-siamo'),
  inLanguage: lingua,
  isPartOf: { '@id': `${config.urlSito}#sito` },
  mainEntity: { '@id': idPersona },
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
