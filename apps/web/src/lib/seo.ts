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
export function percorsiPubblici(): readonly string[] {
  return [
    percorsi.home(),
    percorsi.atenei(),
    percorsi.argomenti(),
    percorsi.guide(),
    percorsi.chiSiamo(),
    percorsi.privacy(),
    ...ATENEI.map((ateneo) => percorsi.ateneo(ateneo.slug)),
    ...ARGOMENTI.map((argomento) => percorsi.argomento(argomento.slug)),
    ...GUIDE.map((guida) => percorsi.guida(guida.slug)),
  ];
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
}: OpzioniMetadata): Promise<Metadata> {
  const t = await getTranslations({ locale: lingua, namespace: 'meta' });
  const titoloPagina = titolo ?? t('titolo');
  const descrizionePagina = descrizione ?? t('descrizione');
  const canonico = urlAssoluto(lingua, percorso);

  return {
    metadataBase: new URL(config.urlSito),
    title: titoloPagina,
    description: descrizionePagina,
    applicationName: config.nome,
    alternates: {
      canonical: canonico,
      languages: lingueAlternative(percorso),
    },
    openGraph: {
      type: 'website',
      siteName: config.nome,
      title: titoloPagina,
      description: descrizionePagina,
      url: canonico,
      locale: lingua === 'it' ? 'it_IT' : 'en_GB',
      alternateLocale: lingua === 'it' ? ['en_GB'] : ['it_IT'],
    },
    twitter: {
      card: 'summary_large_image',
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
