import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { LINGUE_SUPPORTATE, type Lingua } from '@prome/i18n';
import { ARGOMENTI, ATENEI, GUIDE, percorsi } from '@/content';
import { config } from './config';

/**
 * Tutti i percorsi indicizzabili, senza prefisso di lingua.
 *
 * Sono ricavati dai contenuti invece che elencati a mano: una pagina nuova
 * entra nella sitemap perché esiste, non perché qualcuno si è ricordato di
 * aggiungerla.
 *
 * Qui non compaiono contenuti degli utenti — aule studio, post, profili,
 * gruppi — perché non hanno una pagina pubblica: "Pubblico" nel dominio
 * significa visibile a tutti gli studenti iscritti, non al web.
 */
export interface PaginaPubblica {
  percorso: string;
  /**
   * Quanto conta questa pagina *rispetto alle altre nostre*: è un ordine di
   * importanza interno al sito, non una richiesta di posizione. Serve a dire a
   * un crawler con tempo limitato da dove cominciare.
   */
  priorita: number;
  /** Quanto spesso cambia davvero, non quanto vorremmo che venisse riletta. */
  frequenza: 'daily' | 'weekly' | 'monthly' | 'yearly';
  /** Data dell'ultima modifica reale, dove il contenuto ne dichiara una. */
  aggiornataIl?: Date;
}

/**
 * Tutte le pagine indicizzabili, senza prefisso di lingua.
 *
 * Sono ricavate dai contenuti invece che elencate a mano: una pagina nuova
 * entra nella sitemap perché esiste, non perché qualcuno si è ricordato di
 * aggiungerla.
 *
 * Qui non compaiono contenuti degli utenti — aule studio, post, profili,
 * gruppi — perché non hanno una pagina pubblica: "Pubblico" nel dominio
 * significa visibile a tutti gli studenti iscritti, non al web.
 */
export function paginePubbliche(): readonly PaginaPubblica[] {
  return [
    { percorso: percorsi.home(), priorita: 1, frequenza: 'weekly' },
    { percorso: percorsi.atenei(), priorita: 0.8, frequenza: 'weekly' },
    { percorso: percorsi.argomenti(), priorita: 0.8, frequenza: 'weekly' },
    { percorso: percorsi.guide(), priorita: 0.8, frequenza: 'weekly' },
    { percorso: percorsi.chiSiamo(), priorita: 0.6, frequenza: 'monthly' },
    // Le legali si indicizzano — sono un segnale di affidabilità — ma non
    // competono con il resto per l'attenzione di un crawler.
    { percorso: percorsi.lineeGuida(), priorita: 0.4, frequenza: 'yearly' },
    { percorso: percorsi.privacy(), priorita: 0.3, frequenza: 'yearly' },
    { percorso: percorsi.termini(), priorita: 0.3, frequenza: 'yearly' },
    { percorso: percorsi.cookie(), priorita: 0.3, frequenza: 'yearly' },
    ...ATENEI.map((ateneo) => ({
      percorso: percorsi.ateneo(ateneo.slug),
      priorita: 0.7,
      frequenza: 'weekly' as const,
    })),
    ...ARGOMENTI.map((argomento) => ({
      percorso: percorsi.argomento(argomento.slug),
      priorita: 0.7,
      frequenza: 'weekly' as const,
    })),
    // Una guida pubblicata non cambia più: la sua data di modifica è la data
    // in cui è uscita, e dichiararla «settimanale» come tutto il resto è il
    // modo più semplice per far ignorare l'intera sitemap.
    ...GUIDE.map((guida) => ({
      percorso: percorsi.guida(guida.slug),
      priorita: guida.inEvidenza ? 0.8 : 0.6,
      frequenza: 'monthly' as const,
      aggiornataIl: new Date(guida.dataIso),
    })),
  ];
}

/** Solo gli indirizzi, per chi non ha bisogno del resto. */
export function percorsiPubblici(): readonly string[] {
  return paginePubbliche().map((pagina) => pagina.percorso);
}

/** URL assoluto di un percorso in una lingua. */
export function urlAssoluto(lingua: Lingua, percorso: string): string {
  const pulito = percorso === '/' ? '' : percorso;
  return `${config.urlSito}/${lingua}${pulito}`;
}

/**
 * Mappa `hreflang` → URL per un percorso: dice ai motori di ricerca che le
 * versioni sono traduzioni della stessa pagina e non contenuti duplicati.
 * `x-default` punta alla lingua di ripiego, quella servita a chi non chiede
 * nessuna delle lingue supportate.
 */
export function lingueAlternative(percorso: string): Record<string, string> {
  const alternative: Record<string, string> = {};
  for (const lingua of LINGUE_SUPPORTATE) {
    alternative[lingua] = urlAssoluto(lingua, percorso);
  }
  alternative['x-default'] = urlAssoluto('en', percorso);
  return alternative;
}

export interface OpzioniMetadata {
  lingua: Lingua;
  /** Percorso senza prefisso di lingua, es. `/` oppure `/informazioni`. */
  percorso: string;
  /** Se assente si usa il titolo del prodotto. */
  titolo?: string;
  descrizione?: string;
  /** Pagine di servizio che non devono finire nell'indice. */
  noIndex?: boolean;
  /**
   * Data di pubblicazione, per le pagine che sono un articolo e non una
   * schermata del prodotto: cambia `og:type` e aggiunge la data che i social
   * mostrano accanto all'anteprima.
   */
  pubblicatoIl?: string;
}

/**
 * L'anteprima mostrata quando un collegamento viene condiviso.
 *
 * L'immagine la disegna `opengraph-image.tsx`, una per lingua. Va dichiarata
 * qui a mano perché Next la aggiunge da sé **solo** al segmento in cui il file
 * si trova: la pagina iniziale l'aveva, una guida e una legale no — cioè
 * proprio le pagine che qualcuno condivide.
 */
function anteprimeSocial(lingua: Lingua) {
  return [
    {
      url: `${config.urlSito}/${lingua}/opengraph-image`,
      width: 1200,
      height: 630,
      alt: config.nome,
    },
  ];
}

/**
 * Il titolo come lo legge chi scorre una pagina di risultati.
 *
 * Il marchio va in coda, non in testa: la prima parola è quella che decide se
 * il risultato viene letto, e «Prome» la conosce solo chi ci è già stato. La
 * pagina iniziale fa eccezione — lì il marchio *è* il titolo.
 *
 * Il taglio a 60 caratteri non è cosmetico: oltre, Google riscrive il titolo
 * da sé, e quello che scrive non lo scegliamo noi. Se il titolo della pagina è
 * già lungo si rinuncia al suffisso invece di produrre una coda troncata.
 */
const LIMITE_TITOLO = 60;

function titoloCompleto(titolo: string | undefined): string | undefined {
  if (!titolo) return undefined;
  const conMarchio = `${titolo} · ${config.nome}`;
  return conMarchio.length <= LIMITE_TITOLO ? conMarchio : titolo;
}

/**
 * Metadati completi di una pagina: titolo, descrizione, URL canonico,
 * alternative di lingua e anteprime social.
 *
 * Ogni pagina passa di qui, così nessuna dimentica il canonico o gli
 * `hreflang` — sono gli errori che costano di più e si notano di meno.
 */
export async function creaMetadata({
  lingua,
  percorso,
  titolo,
  descrizione,
  noIndex = false,
  pubblicatoIl,
}: OpzioniMetadata): Promise<Metadata> {
  const t = await getTranslations({ locale: lingua, namespace: 'meta' });
  const titoloPagina = titoloCompleto(titolo) ?? t('titolo');
  const descrizionePagina = descrizione ?? t('descrizione');
  const canonico = urlAssoluto(lingua, percorso);

  return {
    metadataBase: new URL(config.urlSito),
    title: titoloPagina,
    description: descrizionePagina,
    applicationName: config.nome,
    // Chi ha scritto, chi ha fatto, chi pubblica: sono tre ruoli e qui sono la
    // stessa persona. Vale la pena dichiararli anche quando coincidono —
    // insieme al `Person` dei dati strutturati sono ciò che lega il sito a un
    // nome invece che a un dominio anonimo.
    authors: [{ name: config.autore.nome, url: urlAssoluto(lingua, percorsi.chiSiamo()) }],
    creator: config.autore.nome,
    publisher: config.autore.nome,
    alternates: {
      canonical: canonico,
      languages: lingueAlternative(percorso),
    },
    openGraph: {
      siteName: config.nome,
      title: titoloPagina,
      description: descrizionePagina,
      url: canonico,
      locale: lingua === 'it' ? 'it_IT' : 'en_GB',
      alternateLocale: lingua === 'it' ? ['en_GB'] : ['it_IT'],
      images: anteprimeSocial(lingua),
      ...(pubblicatoIl
        ? {
            type: 'article' as const,
            publishedTime: pubblicatoIl,
            authors: [config.autore.nome],
          }
        : { type: 'website' as const }),
    },
    twitter: {
      card: 'summary_large_image',
      images: anteprimeSocial(lingua),
      title: titoloPagina,
      description: descrizionePagina,
    },
    robots: noIndex
      ? { index: false, follow: false }
      : {
          index: true,
          follow: true,
          googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
        },
  };
}
